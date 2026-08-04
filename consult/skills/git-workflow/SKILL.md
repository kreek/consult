---
name: git-workflow
description: Use for branches, history edits, conflicts, rebases, recovery, force-push, gh.
---

# Git Workflow

## Iron Law

`NEVER REWRITE SHARED HISTORY OR SKIP RECOVERY.`

Git history is a review, bisect, revert, and release surface. Keep it
recoverable, scoped, and honest.

## When to Use

- Rebases, merge conflicts, bisects, reflog recovery, branch cleanup,
  PR history repair, or force-push decisions.

## When NOT to Use

- Staging reviewed files, splitting commit groups, writing commit messages, or
  committing approved work. Use `commit`.
- Reviewing implementation correctness; use `code-review`.
- Refactor planning; use `refactoring`.
- CI failure triage; use `debugging` to reproduce and root-cause the failing
  check.

## Core Ideas

1. **Inspect before mutation.** Start with status, branch/upstream, staged and
   unstaged diff stats, and recent log. Expand only when risk appears.
2. **Prefer `--force-with-lease --force-if-includes`** over bare force when
   a solo-branch rewrite is genuinely needed.
3. **Preserve a recovery point** (tag, named branch, or noted reflog entry)
   before any risky operation.
4. **Resolve conflicts by preserving intent from both sides**, then run the
   relevant checks.
5. **Test hook policy, not hook wrappers.** Tiny hooks that only `exec` a
   repo script don't need dedicated tests; test the script when it selects
   commands, blocks branches, routes staged files, or handles failures.
6. **At the start of a feature or bug fix, ask the user once**: create or
   switch to a topic branch in the current checkout. On a topic branch
   with distinct new work, ask once between continue here or branch off
   `main`. Don't re-prompt during the same piece of work.
7. **Ask before any GitHub access.** Reaching GitHub makes a network call
   under the user's authenticated account. Get explicit permission first,
   including for reads such as viewing a PR, its diff, or a CI run. This
   covers whichever surface the host gives you: the `gh` CLI, a GitHub MCP
   server, or built-in host GitHub tools. Check which one exists before
   planning the step; `gh` is absent from some sandboxes and hosted sessions.
8. **Humans approve PR and issue text before it is published.** Titles and
   descriptions are author-facing content the user owns. Draft the title and
   body locally, show them, and get explicit approval of that exact text
   before anything creates or updates the PR or issue. Do not let a tool open
   an editor or send unreviewed body text.

## Workflow

1. Read one compact preflight: status, branch/upstream, staged and unstaged
   diff stats, and recent log. Stop on unexpected state.
2. Expand inspection only when risk appears or the operation requires it:
   merge/rebase state, conflict markers, full diffs, upstream divergence, or
   recovery points.
3. Detect hazards: conflicts, secrets, generated churn, unrelated staged work,
   shared history rewrites, or in-flight work that needs isolation.
4. For history operations, name the recovery point and whether the branch
   is local/solo/shared before rewriting, deleting, or force-pushing.
5. Before touching GitHub, identify the available surface (`gh`, GitHub MCP,
   or host tools), then ask for permission for the exact operation or
   operation class needed. Do not treat read-only intent as permission.
6. When an operation would create or update a PR or issue, draft the title
   and description locally, get the user's approval of that text, then run the
   operation with the approved title and body. Do not rely on a tool opening
   an editor or sending unreviewed text.
7. Execute the smallest safe operation. Verify log/range-diff, status, file
   membership, and relevant tests or repro commands.

## Verification

- [ ] Final status is known and scoped: tree clean or explicitly deferred,
      no files staged outside the approved group, no unresolved merge/rebase
      state or conflict markers.
- [ ] Rewritten history was local/solo or explicitly approved; force pushes
      used lease/inclusion protection.
- [ ] `range-diff` or log inspection confirms intended commits remain; a
      reflog/recovery point is available for rollback.
- [ ] Hook tests, when present, cover policy-bearing scripts rather than
      trivial wrapper files.
- [ ] At the start of work, the user picked a topic branch in the
      current checkout. The menu did not re-fire during continued work on
      the same branch, and new work wasn't silently stacked on unrelated
      branch work.
- [ ] No GitHub operation ran without explicit user permission for that
      operation or operation class, whichever surface was used.
- [ ] PR and issue titles and descriptions were drafted and approved by the
      user before anything created or updated them.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Force push should fix it" | Verify the branch is local/solo or approved, then use lease/inclusion protection. | Disposable local-only branch with no remote. |
| "Rewrite this shared branch" | Stop and ask for explicit approval plus a recovery point. | The branch is confirmed local and unpublished. |
| "Resolve conflict by taking ours/theirs" | Preserve intent from both sides, then run relevant checks. | Generated file regenerated after source conflict is resolved. |
| "Reading from GitHub is harmless" | Ask first; any GitHub read uses network and the user's auth. | The user already approved that exact operation class. |
| "`gh` isn't installed, so GitHub is out of reach" | Check for a GitHub MCP server or host GitHub tools, then ask before using them. | The host genuinely exposes no GitHub surface. |
| "Just open the PR with a quick title" | Draft the title and body, get the user's approval, then create it. | The user already approved that exact title and body. |

## Handoffs

- Use `commit` for staging reviewed work, splitting commit groups, writing
  commit messages, or committing approved changes.
- Use `refactoring` when separating structural and behavioral changes
  requires code changes.
- Use `release` when the working tree includes a version manifest bump,
  CHANGELOG entry, deprecation, or release tag.
- Use `debugging` before bisecting if the failure is not reproducible.
- Respect Codex/user sandbox approval requirements; this skill does not
  bypass permission gates.
