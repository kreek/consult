---
name: git-workflow
description: Use for branches, history edits, conflicts, rebases, recovery, force-push, gh.
---

# Git Workflow

## Iron Law

`NEVER REWRITE SHARED HISTORY OR SKIP RECOVERY.`

Git history is a review, bisect, revert, and release surface. Keep it
recoverable, scoped, and honest. The host owns git mechanics and access
permission; this skill owns the gates: recoverability and approval of
published text.

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

1. **Inspect before mutation.** Know the tree, branch, and upstream state
   before any history operation.
2. **Prefer `--force-with-lease --force-if-includes`** over bare force when
   a solo-branch rewrite is genuinely needed.
3. **Preserve a recovery point** (tag, named branch, or noted reflog entry)
   before any risky operation.
4. **Resolve conflicts by preserving intent from both sides**, then run the
   relevant checks.
5. **Test hook policy, not hook wrappers.** Tiny hooks that only `exec` a
   repo script don't need dedicated tests; test the script when it selects
   commands, blocks branches, routes staged files, or handles failures.
6. **Branch without ceremony.** Starting new work on the default branch,
   create a topic branch first. On an existing topic branch, keep going
   unless the new work is clearly unrelated; then branch off `main` and say
   which branch received the work. Do not ask which branch to use.
7. **The host's permission system owns GitHub access.** Hosts already gate
   network calls and `gh` under the user's account; do not add a second
   chat-level ask on top of an approval the host has granted. Reserve your
   own questions for GitHub writes that publish user-owned text (PRs,
   issues, comments) and for destructive operations. Check which surface
   exists before planning the step (`gh` CLI, GitHub MCP, or built-in host
   tools); `gh` is absent from some sandboxes and hosted sessions.
8. **Humans approve PR and issue text before it is published.** Titles and
   descriptions are author-facing content the user owns. Draft the title and
   body locally, show them, and get explicit approval of that exact text
   before anything creates or updates the PR or issue. Do not let a tool open
   an editor or send unreviewed body text.

## Workflow

1. Inspect enough to know the risk: tree, branch, and upstream state, plus
   any hazards in play (conflicts, secrets, generated churn, unrelated staged
   work, shared-history rewrites, in-flight work needing isolation). Stop on
   unexpected state.
2. For history operations, name the recovery point and whether the branch
   is local/solo/shared before rewriting, deleting, or force-pushing.
3. Before touching GitHub, identify the available surface (`gh`, GitHub MCP,
   or host tools) and let the host's permission flow authorize access. Ask
   the user directly only for writes that publish text or destroy state.
4. When an operation would create or update a PR or issue, draft the title
   and description locally, get the user's approval of that text, then run the
   operation with the approved title and body. Do not rely on a tool opening
   an editor or sending unreviewed text.
5. Execute the smallest safe operation. Verify log/range-diff, status, file
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
- [ ] New work starting on the default branch moved to a topic branch, and
      new work wasn't silently stacked on unrelated branch work.
- [ ] GitHub access ran through the host's permission surface; publishing
      writes and destructive operations also had the user's explicit
      approval.
- [ ] PR and issue titles and descriptions were drafted and approved by the
      user before anything created or updated them.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Force push should fix it" | Verify the branch is local/solo or approved, then use lease/inclusion protection. | Disposable local-only branch with no remote. |
| "Rewrite this shared branch" | Stop and ask for explicit approval plus a recovery point. | The branch is confirmed local and unpublished. |
| "Resolve conflict by taking ours/theirs" | Preserve intent from both sides, then run relevant checks. | Generated file regenerated after source conflict is resolved. |
| "The host approved `gh` once, so publish freely" | Host permission covers access; publishing user-owned text (PRs, issues, comments) still needs the user's approval of that text. | The user already approved that exact text and operation. |
| "`gh` isn't installed, so GitHub is out of reach" | Check for a GitHub MCP server or host GitHub tools and go through the host's permission flow. | The host genuinely exposes no GitHub surface. |
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
