---
name: async-systems
description: Use for async systems, concurrency, queues, streams, pub/sub, ordering, backpressure.
---

# Async Systems

## Iron Law

`EVERY ASYNC BOUNDARY NAMES OWNERSHIP, LIFETIME, BACKPRESSURE, AND FAILURE SEMANTICS.`

Async work fails when ownership, cancellation, retry, ordering, and
failure handling are left implicit.

## When to Use

- Designing or reviewing async execution, coordination primitives, background
  work, live updates, streams, brokers, ordering, and backpressure.
- Investigating races, deadlocks, stuck tasks, event-loop blocking, starvation,
  memory growth, retry exhaustion, dead jobs, lag, poison messages, replay,
  ordering, or delivery issues.

## When NOT to Use

- Ordinary request/response API design only; use `api`.
- Remote-call timeout/circuit-breaker policy outside async mechanics;
  use `error-handling`.
- Metrics, dashboards, alerts, and runbooks only; use
  `observability`.
- Performance measurement without async design changes; use
  `performance`.
- Database transaction isolation; use `database`.

## Core Ideas

1. For user-facing live updates, start with polling, SSE, or
   WebSockets. Escalate to Kafka/Kinesis/Redis Streams only after
   naming the requirement the simpler transport cannot satisfy:
   independent replay, long retention, audit history, offline
   catch-up, multi-service fanout, consumer-group scaling, partitioned
   throughput, or durable recovery.
2. Send immutable data across async boundaries. Keep mutable state owned by
   one scope.
3. Every spawned task belongs to a scope that cancels, awaits, or
   supervises it.
4. Every queue, channel, worker pool, semaphore, stream, and buffer has
   a bound and overflow policy.
5. Locks are an escape hatch: keep them short, ordered, and away from
   I/O, awaits, or callbacks.
6. Job payloads contain stable identifiers and immutable inputs, not
   live session/request/thread-local state.
7. Retried jobs and stream consumers are idempotent, deduplicated, or
   explicitly non-retryable.
8. Event schemas are contracts; version them and keep consumers
   compatible.
9. Delivery guarantees, ordering keys, retention, replay, offsets,
   DLQs, retry budgets, and poison-message handling are explicit.
10. Silent async failure is a bug: exhausted jobs, lag, dropped events,
    and dead work need visible signals.

## Workflow

1. Name producers, consumers, shared state, owners, transport, queue,
   broker, lifecycle, and user-facing latency expectation.
2. Pick the simplest coordination/transport that preserves ownership.
   For live updates, try polling/SSE/WebSockets first; if a broker is
   chosen, record the requirement that forced it.
3. Define task scope, cancellation path, shutdown behavior, queue
   bounds, overflow behavior, lock ordering, worker concurrency,
   timeout, retry budget, backoff, and terminal failure behavior.
4. For jobs, decide payload, idempotency, uniqueness, atomic enqueue, priority,
   and deploy compatibility.
5. For streams, decide schema, version, order key, delivery, retention, replay,
   ack/offset, DLQ, poison-message policy, and backpressure.
6. Add observability for enqueue/start/success/retry/exhaustion,
   latency, queue depth, dead jobs, lag, throughput, errors,
   reconnects, dropped events, and consumer health.
7. Test contention, cancellation, shutdown, duplicate execution,
   retry exhaustion, missing/changing data, expired sessions,
   duplicates, reordering, drops, reconnects, replay, slow consumers,
   and poison messages as applicable.

## Verification

- [ ] Every task has a governing scope and deterministic shutdown
      path.
- [ ] Every queue/channel/pool/stream/buffer is bounded with an
      explicit overflow policy.
- [ ] No lock is held across I/O, await/yield, or user callbacks; lock
      acquisition order is global where multiple locks remain.
- [ ] Blocking work cannot starve async or latency-sensitive work.
- [ ] Payloads use stable IDs and immutable data; they do not rely on
      request, session, thread-local, open connection, or in-memory
      object state.
- [ ] Retry policy has bounded attempts, delay/backoff, and terminal
      handling.
- [ ] Retried side effects are idempotent, deduplicated, or marked
      non-retryable with a documented reason.
- [ ] Polling, SSE, or WebSockets were considered first for
      user-facing live updates; any broker choice names the specific
      requirement simple HTTP/browser streaming could not satisfy.
- [ ] Event schema, versioning, delivery guarantee, ordering key,
      retention, replay, offset/ack, DLQ, and poison-message handling
      are explicit where streams are involved.
- [ ] Async failure modes are observable and tested.

## Tripwires

Use these when the shortcut thought appears:

- Pass stable IDs and immutable parameters across async boundaries; reload
  request/session/thread-local state inside the job only when needed.
- Name retryable errors, retry budget, backoff, and terminal behavior.
- Make exhausted or rescued work visible by re-raising, marking terminal, or
  recording failure.
- Enqueue after transaction commit or use transactional outbox/enqueue when the
  job reads transaction-written state.
- Isolate user-facing work from bulk queues with priority, concurrency,
  timeout, or separate workers.

## Handoffs

- `contract-first`: durable event-schema or topic-contract approval before
  consumers bind to it.
- `domain-modeling`: remove shared mutable state from core design.
- `api`: public subscription, webhook, SSE, or event-contract surface.
- `error-handling`: retry budgets and dependency failure policy.
- `database`: transactional enqueue, outbox/CDC, locking, isolation, schema.
- `observability`: dashboards, alerts, traces, runbooks.
- `release`: worker draining, deploy compatibility, migrations, rollout gates.
- `debugging`: existing races, deadlocks, stuck jobs, or lag.
- `proof`: assert at every async handoff (producer → queue → consumer,
  pub/sub seams, worker-pool boundaries) for ownership, ordering,
  backpressure, and failure semantics.

## References

- `references/browser-streaming.md`: polling, SSE, and WebSocket
  choices.
- `references/kafka.md`: topics, partitions, consumer groups, offsets,
  delivery semantics.
- `references/kinesis.md`: streams, shards, partition keys, sequence
  numbers, retention, consumers.
- `references/redis-streams.md`: Redis Streams, consumer groups,
  pending entries, acknowledgements, claiming.
