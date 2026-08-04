---
name: error-handling
description: Use for error handling, error types, propagation, retries, user messages, recovery.
---

# Error Handling

## Iron Law

`ERRORS CARRY CONTEXT. NEVER CATCH WITHOUT HANDLING OR RE-RAISING.`

## When to Use

- Designing or reviewing typed errors, exceptions, Result/Either flows,
  domain error boundaries, wrapping, retries, remote-call failures, panics,
  user-facing errors, or swallowed failures.

## When NOT to Use

- Security-specific failure shape; pair with `security`.
- REST status-code taxonomy or public API error schema; use `api`.
- Observability of errors in production; pair with `observability`.

## Core Ideas

1. Failure is part of the function contract.
2. Add context at each boundary; preserve the original cause. Catch
   only where you can decide: recover, translate, retry, or terminate.
3. Translate failures when the caller's contract changes. Domain,
   infrastructure, API, CLI, and UI errors should not leak across
   boundaries unchanged.
4. Expected failures are typed: use named exception classes,
   discriminated unions, enums, or structured `Result` variants for
   recoverable cases.
5. Classify errors as user-correctable, transient, or programmer/system
   faults.
6. User-facing messages are safe and actionable; internal errors keep
   diagnostic detail under a correlation ID.
7. Remote calls declare timeout, retry, idempotency, and dependency-failure
   behavior together. Retry transient failures in one layer with a capped
   budget and jitter/backoff.
8. Panics/assertions are for impossible states and process boundaries, not
   routine control flow.

## Workflow

1. Identify where the error originates and where the decision can be
   made. Choose return-value errors, exceptions, Result/Either, or
   process termination based on caller contract.
2. Define the domain error vocabulary for expected failures. Translate
   it when crossing into another domain or public interface.
3. Wrap with operation, resource, and correlation context. Translate to
   user/API/CLI shape at the boundary.
4. For each remote dependency, define timeout, retry budget,
   idempotency requirement, and failure behavior before coding the
   caller.
5. Test at least one failure path for each public operation that can
   fail.

## Verification

- [ ] Every catch/rescue/except either recovers, translates, retries
      safely, or re-raises with context.
- [ ] Expected failures use typed error classes, structured
      Result/Either variants, enums, or discriminated unions; no
      recoverable path raises/throws bare strings or anonymous generic
      errors.
- [ ] Domain, infrastructure, API, CLI, and UI errors are translated at
      their boundaries instead of leaking across unchanged.
- [ ] Failure-capable public functions document failure in their
      contract; wrapped errors preserve underlying cause.
- [ ] User-facing errors are actionable without exposing stack traces,
      SQL, file paths, hostnames, secrets, or auth-enumeration clues;
      diagnostic detail is reachable by correlation ID.
- [ ] Retries apply only to idempotent/transient failures with a
      capped budget, jitter/backoff, and one retrying layer.
- [ ] Remote dependencies define finite timeouts and explicit circuit
      breaker, bulkhead, load-shedding, or fail-fast behavior.
- [ ] Tests cover representative failure paths.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "Log and continue is fine" | Decide whether to recover, translate, retry, or terminate. | Best-effort telemetry failure with an explicit drop policy. |
| "This can't fail in practice" | Declare the failure-capable contract and test a representative failure. | Compile-time impossible state enforced by type/value construction. |
| "Swallow at the boundary" | Translate for the caller and preserve the cause for diagnostics. | Security boundary deliberately hides details while logging correlation. |
| "We'll add remote-call protection later" | Define timeout, retry budget, idempotency guard, and dependency-failure behavior now. | Local in-memory call with no blocking I/O. |

## Handoffs

- Use `security` for auth, secrets, validation, fail-closed behavior,
  and information disclosure.
- Use `api` for REST status-code selection, Problem Details/JSON:API
  error contracts, public idempotency-key contracts, OpenAPI response
  docs, and compatibility.
- Use `domain-modeling` when the error vocabulary is part of the domain
  model or state machine.
- Use `observability` for correlation IDs, logs, traces, and error-rate
  alerts, including critical dependency health.

## References

- `../api/references/rest-error-status-codes.md`: local REST error
  status-code decision tree.
