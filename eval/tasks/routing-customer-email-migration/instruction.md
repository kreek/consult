# Customer Email Migration Triage

Do not edit files.

The team needs to add a unique customer email rule to a large PostgreSQL table.
Normal writes must continue during rollout, and operators need a clear rollback
path if validation fails.

Write an implementation-readiness note that includes:

- the user-visible goal;
- the risk profile;
- the engineering lenses to apply;
- the engineering lenses to explicitly exclude for now;
- the validation plan;
- the review-and-completion loop before claiming done.

Work in the provided repository. Do not add external dependencies.
