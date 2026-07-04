---
name: scaffolding
description: Use for scaffolding, new projects, package setup, quality tooling, CI, and repo structure.
---

# Scaffolding

## Iron Law

`NO FEATURE CODE BEFORE THE TOOLCHAIN PROVES IT CAN FAIL AND PASS.`

A scaffold is done only when a clean clone can install, check, test,
and run the baseline without local knowledge.

## When to Use

- Starting a new repo/app, or adding missing package management,
  linting, formatting, typechecking, testing, coverage, or CI.

## When NOT to Use

- Adding a feature to an already healthy project; use the domain
  skill plus `proof`.
- Release pipeline beyond baseline CI; use `release`.
- Detailed UI design choices after the framework is chosen; use
  `ui-design`.

## Core Ideas

1. The user owns scaffold choices. The agent recommends options in
   priority order, then waits for approval before creating files,
   installing packages, or running generators.
   If a structural dependency is not already specified, ask before researching
   or selecting it.
2. Scaffolding creates the baseline, not the feature. Decide project kind,
   language/runtime, deployment assumption, framework/template, quality
   baseline, files, and commands before feature code.
3. Named artifacts are literal requirements. Create requested files such as
   `tsconfig.json`, `package.json`, `pyproject.toml`, CI, or README unless the
   user approves a substitute.
4. Commands are part of the contract. Standardize `test`, `lint`, `format`,
   `typecheck`, and `coverage` where applicable; CI should run the same checks
   developers run locally.
5. `typecheck` must run a type checker or established equivalent using the
   config added for it. Syntax checks such as `node --check` are smoke/lint, not
   typechecks.
6. Fresh web apps default to mature frameworks with routing, request handling,
   testing, and deployment conventions unless the user asks for a smaller or
   hand-rolled setup.

## Workflow

1. Detect language, framework, existing conventions, and git state.
2. If Pi offers `/consult:scaffold`, run it for new scaffold work before
   presenting the gate. It also activates when the user invokes
   `/skill:scaffolding` or makes an explicit fresh app/project request.
3. Before creating scaffold files, installing packages, or running generators,
   present a **Scaffold Decision Gate** and wait for explicit user approval.
   Include: project intent, project kind, language/runtime, deployment
   assumption, framework/template, quality baseline, files and commands, and
   this user decision menu:
   1. Approve: create files / install packages / run generators
   2. Refine: change the scaffold plan
   3. Cancel: stop scaffolding
4. Offer choices in order of importance: language/runtime, deployment
   assumption, framework/template, then framework-local choices. Recommend one
   option and name the tradeoff. Use `references/stacks/index.yaml` when a stack
   preset fits; otherwise read `references/language-defaults.md` or current
   official sources and name the fallback.
   For frameworks, databases, ORMs, auth clients, SDKs, state libraries, job
   queues, or other structural runtime dependencies, ask before dependency
   research unless the user or selected stack already named the choice.
5. For fresh scaffolds, initialize git and `.gitignore` before feature code,
   unless the user or environment blocks it. If skipped, say why.
6. Select one package manager and commit its lockfile before install or
   generator commands.
7. Classify web work as prototype, new app scaffold, or production-bound app.
8. Add standard commands and map every requested artifact to the command that
   consumes it.
9. Add one smoke test that can fail and pass; add CI that runs the same checks.
10. Document purpose, install, run, and test commands in README.

## Verification

- [ ] Scaffold choices were approved before mutation, or the request already
      specified every material setup choice.
- [ ] Structural dependency research or selection was approved, unless the
      user or selected stack already specified the dependency.
- [ ] Fresh scaffold has git, `.gitignore`, one package manager, committed
      lockfile, and clean install from a fresh clone.
- [ ] Requested artifacts exist by name, and every added config is consumed by a
      standard command.
- [ ] `test`, `lint`, `format`, `typecheck`, and `coverage` exist where
      applicable; `typecheck` is not a syntax-only check.
- [ ] Web classification and stack/default source are named; mature framework
      default was used or the smaller setup was requested.
- [ ] Smoke test, CI, README, secret hygiene, `.env.example` placeholders, and
      dependency/build-output ignores are present where relevant.

## Risk Tier

For prototypes, use the same command names even if some checks are
lightweight. Before production or collaboration, promote the scaffold
to the full checklist.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "A similar config file will do" | Use the requested artifact name, or ask before substituting a nearby config. | The user approved the substitute. |
| "`node --check` counts as typecheck" | Wire `typecheck` to a real type checker or established equivalent. | The language has no type checker and the documented equivalent is used. |
| "The command passed, so the scaffold works" | Verify the requirement -> artifact -> command mapping, not only command success. | None. |
| "Set up git later" | Initialize git and `.gitignore` before feature code. | The user or environment blocks repo creation and the skip is reported. |
| "Approval would slow this down, just create the files" | Present Approve, Refine, and Cancel choices before scaffold mutation. | The request already specified every material setup choice. |
| "I'll pick the framework/ORM myself" | Ask before researching or selecting structural runtime dependencies. | The user or selected stack already named the choice, or it is a small dev-only utility. |

## Handoffs

- `domain-modeling`: first feature/domain data model.
- `proof`: first real feature test.
- `release`: CI becomes release/deploy automation.
- `security`: dependency audits, secret scanning, signing, supply-chain gates.

## References

- `references/stacks/index.yaml`: stack presets.
- `references/language-defaults.md`: language/runtime defaults.
