---
name: database
description: Use for databases, schemas, migrations, indexes, transactions, query plans, locking.
---

# Database

## Iron Law

`PROTECT PRODUCTION DATA FIRST: PROVE ROLLOUT, LOCKING, AND RECOVERY BEFORE CHANGE.`

## When to Use

- Schema design, migrations, indexes, query plans, isolation levels,
  connection pools, soft delete, N+1 fixes, online DDL,
  transactional outbox/CDC, or production data changes.

## When NOT to Use

- API contract design; use `api`.
- Rollout sequencing outside the database; pair with `release`.
- Cache freshness and invalidation; use `performance`.

## Core Ideas

1. Destructive and hard-to-reverse database changes are the user's call.
   Route schema and migration changes that other code or stored data binds
   to through `contract-first`, which owns the approval scope; data deletion
   and non-reversible backfills always need explicit approval for data
   safety. An additive, easily reversed change on a development-stage schema
   proceeds with the shape stated in the close-out.
2. Use the project's existing database unless the task is choosing a store.
   For greenfield defaults and store-selection caveats, use `architecture`.
3. Expand, migrate, verify, switch, then contract in separate
   deployable steps.
4. Review SQL and lock behavior, not just ORM code.
5. Backfills are batched, resumable, observable, and reversible.
6. Constraints enforce invariants. Every uniqueness invariant needs a DB-level
   `UNIQUE`, `EXCLUDE`, composite, or partial equivalent. Application-layer
   checks race under concurrency.
7. Indexes and plans follow real access paths. New foreign keys and known
   `WHERE`, `JOIN`, or `ORDER BY` predicates need supporting indexes in the
   same migration, or a stated reason they do not; query changes need
   EXPLAIN/ANALYZE plans on production-shaped data.
8. Isolation level is a design decision; retries are part of
   serializable correctness.
9. State changes and durable publication need atomicity through
   transactional outbox, CDC, or an equivalent handoff when the two
   cannot silently diverge.
10. Data recovery is part of the change: backup/PITR must cover the
    blast radius.

## Workflow

1. Classify the change as schema, data, query, index, constraint,
   transaction, or operational tuning. Identify table size, write rate,
   lock risk, rollback path, and deploy order.
2. Review migration files directly for destructive operations and lock
   behavior. Capture EXPLAIN/ANALYZE for important query changes on
   representative data.
3. Split unsafe changes into expand-contract phases. Document
   verification and rollback in the PR or deploy note.

## Verification

- [ ] Migration SQL was reviewed for destructive changes and locking.
- [ ] Destructive or tightening changes are split across expand-contract
      phases.
- [ ] Backfills are batched and resumable; each batch holds locks
      briefly.
- [ ] Every uniqueness invariant in the change is enforced by a DB constraint
      or equivalent engine-specific mechanism, not application-layer logic.
- [ ] New FK columns and known query predicates (`WHERE`, `JOIN`, `ORDER BY`)
      have supporting indexes in the same migration, or the omission is
      explicitly justified.
- [ ] Index/constraint creation uses the online mechanism for the
      target database.
- [ ] Engine-specific DDL uses `references/online-ddl.md` and was verified
      against the target engine before claiming done. SQLite passing is not
      proof of Postgres behavior.
- [ ] Important query changes include representative EXPLAIN/ANALYZE
      evidence.
- [ ] Isolation level and retry behavior are explicit for transactional
      changes.
- [ ] State changes and event/job publication cannot diverge silently
      when the workflow depends on both.
- [ ] Rollback and backup/PITR coverage are documented.
- [ ] Schema and migration changes were routed through `contract-first`,
      and destructive data operations (deletion, non-reversible backfills)
      had explicit user approval before landing.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "The table is small, ALTER it in place" | Use the target engine's online mechanism or document why production size and write rate cannot matter. | Size and write rate are verified negligible and the reasoning is recorded. |
| "The migration will be quick" | Measure lock behavior on representative load or assume the worst case. | None. |
| "We can backfill later" | Ship the backfill plan now or leave the schema expand-only. | None. |
| "Just add a `deleted_at` column" | Decide soft-delete lifecycle once and enforce reads, indexes, and schema around it. | The project already has an enforced soft-delete convention. |
| "This index looks unused, drop it" | Observe a full traffic cycle before dropping an index. | The table itself is being removed as dead schema. |
| "The app already checks uniqueness" | Enforce correctness invariants with DB constraints; application checks race under concurrency. | The invariant is advisory and duplicates are explicitly acceptable. |
| "Add the index when it gets slow" | Add supporting indexes in the same migration when access paths are known. | The access path is speculative and the omission is justified in the migration. |
| "Partial/expression indexes work the same everywhere" | Check target-engine semantics for partial, expression, deferrable, exclusion, and specialized indexes before relying on them. | The behavior was verified on the target engine. |
| "It's just another column" | Load `security` before adding password, token, API key, MFA, recovery-code, or sensitive-PII storage. | The column holds no credentials or sensitive data. |

## Handoffs

- `contract-first`: schema, migration, or stored-shape approval before
  implementation locks the change.
- `release`: deploy ordering, rollback rehearsal, feature flags.
- `performance`: measured query latency or throughput change.
- `observability`: migration and query dashboards/alerts.
- `async-systems`: stream or worker consumers after durable handoff.
- `security`: credentials, secrets, tokens, MFA factors, sensitive PII.

## References

- `references/online-ddl.md`: online migration patterns.
- `references/explain-and-isolation.md`: EXPLAIN and isolation notes.
