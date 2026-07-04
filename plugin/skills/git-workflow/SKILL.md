---
name: git-workflow
description: Use for branches, history edits, conflicts, rebases, recovery, force-push, and gh.
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
7. **Ask before any GitHub CLI command.** `gh` can make network calls and
   use the user's authenticated account. Get explicit permission before
   running any `gh` command, including read-only commands such as
   `gh pr view`, `gh pr diff`, or `gh run view`.
8. **Humans approve PR and issue text before it is published.** Titles and
   descriptions for `gh pr create`, `gh pr edit`, `gh issue create`, and
   `gh issue edit` are author-facing content the user owns. Draft the title
   and body locally, show them, and get explicit approval of that exact text
   before any `gh` command creates or updates the PR or issue. Do not let
   `gh` open an editor or send unreviewed body text.

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
5. Before GitHub CLI use, ask for permission for the exact `gh` command or
   command class needed. Do not treat read-only intent as permission.
6. When a `gh` command would create or update a PR or issue, draft the title
   and description locally, get the user's approval of that text, then run the
   command with the approved title and body. Do not rely on `gh` opening an
   editor or sending unreviewed text.
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
- [ ] No `gh` command was run without explicit user permission for that
      command or command class.
- [ ] PR and issue titles and descriptions were drafted and approved by the
      user before any `gh` command created or updated them.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Force push should fix it" | Verify the branch is local/solo or approved, then use lease/inclusion protection. | Disposable local-only branch with no remote. |
| "Rewrite this shared branch" | Stop and ask for explicit approval plus a recovery point. | The branch is confirmed local and unpublished. |
| "Resolve conflict by taking ours/theirs" | Preserve intent from both sides, then run relevant checks. | Generated file regenerated after source conflict is resolved. |
| "Read-only `gh` is harmless" | Ask before any `gh` command because it uses network and auth. | The user already approved that exact command class. |
| "Just open the PR with a quick title" | Draft the title and body, get the user's approval, then run `gh pr create`/`gh issue create`. | The user already approved that exact title and body. |

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
