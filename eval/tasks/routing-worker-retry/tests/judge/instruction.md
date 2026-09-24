# Worker Retry Change Triage

Do not edit files.

A notification worker needs a retry-once behavior for temporary delivery
failures. It already processes batches and logs basic start and finish events.
The team wants to keep throughput predictable and avoid duplicate sends.

Write an implementation-readiness note that includes:

- the user-visible goal;
- the risk profile;
- the engineering lenses to apply;
- the engineering lenses to explicitly exclude for now;
- the validation plan;
- the review-and-completion loop before claiming done.

Work in the provided repository. Do not add external dependencies.
