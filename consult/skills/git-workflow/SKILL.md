---
name: git-workflow
description: Use for branches, history edits, conflicts, rebases, recovery, force-push, gh.
---

# Git Workflow

## Iron Law

`NEVER REWRITE SHARED HISTORY OR SKIP RECOVERY.`

The host owns git mechanics. This skill owns the gates: recoverability,
GitHub permission, and approval of published text.

## When to Use

- Rebases, merge conflicts, bisects, reflog recovery, branch cleanup, PR
  history repair, force-push decisions, or any GitHub access.

## When NOT to Use

- Staging, splitting, or committing reviewed work; use `commit`.
- Reviewing correctness; use `code-review`. Refactor planning; use
  `refactoring`. CI failure triage; use `debugging`.

## Rules

1. At the start of a feature or bug fix, ask the user once: create or switch
   to a topic branch in the current checkout. On a topic branch with distinct
   new work, ask once between continuing here or branching off `main`. Do not
   re-prompt during the same piece of work.
2. Ask before any GitHub access, including reads such as viewing a PR, its
   diff, or a CI run, because every call runs under the user's authenticated
   account. Identify the surface first (`gh` CLI, GitHub MCP server, or host
   tools); `gh` is absent from some sandboxes, which does not mean GitHub is
   out of reach.
3. Humans approve PR and issue text before it is published. Draft the title
   and body locally, show them, and get approval of that exact text. Never
   let a tool open an editor or send unreviewed text.
4. Inspect tree, branch, and upstream state before any history operation, and
   stop on unexpected state. Name a recovery point (tag, branch, or reflog
   entry) and whether the branch is local, solo, or shared before rewriting,
   deleting, or force-pushing. Shared history is rewritten only with explicit
   approval; force pushes use `--force-with-lease --force-if-includes`.
5. Resolve conflicts by preserving intent from both sides, then run the
   relevant checks. Verify with `range-diff` or log inspection that intended
   commits remain.
6. Test hook policy, not hook wrappers. A hook that only execs a repo script
   needs no test; the script that selects commands, blocks branches, or
   routes files does.
7. This skill never bypasses the host's sandbox or approval gates.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Force push should fix it" | Verify the branch is local/solo or approved, then use lease and inclusion protection. | Disposable local-only branch with no remote. |
| "Rewrite this shared branch" | Stop and ask for explicit approval plus a recovery point. | The branch is confirmed local and unpublished. |
| "Resolve conflict by taking ours/theirs" | Preserve intent from both sides, then run checks. | A generated file regenerated after the source conflict is resolved. |
| "Reading from GitHub is harmless" | Ask first. | The user already approved that exact operation class. |
| "`gh` isn't installed, so GitHub is out of reach" | Check for a GitHub MCP server or host tools, then ask before using them. | The host exposes no GitHub surface. |
| "Just open the PR with a quick title" | Draft title and body, get approval, then create it. | The user already approved that exact title and body. |

## Handoffs

- `commit`: staging, splitting, and committing approved work.
- `refactoring`: separating structural and behavioral changes in code.
- `release`: version bumps, CHANGELOG entries, tags in the working tree.
- `debugging`: reproduce before bisecting.
