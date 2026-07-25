---
name: performance
description: Use for performance, profiling, latency, throughput, allocation, caching, hot paths.
---

# Performance

## Iron Law

`MEASURE BEFORE OPTIMIZING. MEASURE AGAIN BEFORE KEEPING THE CHANGE.`

## When to Use

- Diagnosing slowness, optimizing latency/throughput/allocation,
  reading profiles, designing benchmarks, investigating p99/p99.9, or
  deciding whether a performance change is worth it.
- Adding, reviewing, tuning, or debugging caches (application,
  database, Redis/Memcached, CDN, browser, edge), including stale
  data, stampedes, hot keys, and miss latency.

## When NOT to Use

- Concurrency correctness without measured slowness; use
  `async-systems`.
- Database query safety without profiling context; use `database`.
- HTTP API cache semantics unrelated to storage or performance; use
  `api`.

## Core Ideas

1. Name the target metric before changing code.
2. Use a realistic workload and identical before/after conditions.
3. Optimize the measured bottleneck, not the code that only looks suspicious.
4. Tail latency matters; averages hide the slow requests users feel.
5. CPU, off-CPU, memory, allocation, I/O, lock contention, and
   network wait are different problems.
6. Micro-benchmarks prove local mechanics, not end-to-end wins.
7. Keep complexity only when the measured gain justifies it.
8. Caches need a source of truth, invalidation trigger, stale
   tolerance, key contract, stampede protection, and metrics before
   they are kept.
9. Cache keys encode every input that changes the value, including
   freshness, tenant, permissions, locale, and version.
10. Treat cache contents as sensitive storage when keys or values
    contain secrets, raw PII, tenant data, or authorization context.

## Workflow

1. Define the metric: p99 latency, throughput, CPU time, allocation
   rate, memory, or error budget impact. Capture baseline with
   production-shaped data and concurrency.
2. Profile to find the dominant bottleneck. If caching is considered,
   state the value being cached, source of truth, invalidation trigger,
   stale tolerance, key contract, stampede policy, TTL/jitter, and
   cache metrics.
3. Make one change.
4. Re-measure under the same conditions. Check adjacent regressions:
   memory, error rate, tail latency, CPU, maintainability.

## Verification

- [ ] Target metric is named and user/business relevance is clear.
- [ ] Baseline and after measurements use the same workload and
      environment; raw results or profile artifacts are saved.
- [ ] Only one performance change is measured per commit.
- [ ] Off-CPU and allocation behavior were considered where relevant.
- [ ] Load generator avoids coordinated omission for latency work.
- [ ] Adjacent metrics did not regress enough to erase the win.
- [ ] Added complexity is justified by measured improvement.
- [ ] Cache safety is specified: owner, source of truth, invalidation
      trigger, stale tolerance, key contract, TTL/jitter, negative
      caching, and sensitive-data handling.
- [ ] Hot keys have stampede protection; cache metrics cover hit
      rate, miss latency, eviction, memory, and refresh errors.
- [ ] Cache tests cover stale data and invalidation, not only the
      warm-cache happy path.

## Tripwires

| Trigger | Do this instead | False alarm |
|---|---|---|
| "This code looks slow" | Measure first and name the target metric. | The user asked only for a hypothesis, not a change. |
| "Average latency improved" | Check p95/p99 and adjacent metrics before keeping the change. | The workload is batch-only and tail latency is not relevant. |
| "Micro-benchmark is faster, so the app is faster" | Prove the end-to-end path or scope the claim to local mechanics. | The requested claim is only about the local primitive. |
| "Add a cache" | Name source of truth, invalidation trigger, stale tolerance, and cache metrics first. | The cache is a bounded per-request memo with no cross-request staleness. |
| "TTL handles invalidation" | Prefer event/key-based expiration; use TTL as a safety net. | Best-effort cache where stale data is explicitly acceptable. |
| "The hot key is rare" | Add stampede protection or prove concurrency cannot pile up. | Single-process local cache with bounded callers. |
| "No need to re-measure" | Re-measure under the same workload after the change. | The change was reverted or not kept. |

## Handoffs

- Use `database` for query plans, indexes, and migration risk.
- Use `observability` for production validation and continuous
  profiling.
- Use `security` when cache keys/values can include tenant data,
  secrets, authorization context, or personal data.
- Use `error-handling` when cached data participates in remote-call
  retry or fallback behavior.
