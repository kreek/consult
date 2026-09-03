import { describe, expect, it, vi } from "vitest";

import {
  REVIEW_STATE_ENTRY,
  SELF_REVIEW_MARKER,
  createIndependentReviewExtension,
} from "../extensions/self-review-guard.ts";

function makeHarness(runReview = vi.fn().mockResolvedValue({ output: "No findings.\nResidual risk: none." })) {
  const handlers = new Map();
  const commands = new Map();
  const entries = [];
  const sent = [];
  const pi = {
    appendEntry: (customType, data) => entries.push({ type: "custom", customType, data }),
    registerCommand: (name, command) => commands.set(name, command),
    sendMessage: (message, options) => sent.push({ message, options }),
    on: (eventName, handler) => handlers.set(eventName, handler),
  };

  createIndependentReviewExtension({ runReview })(pi);
  return { commands, entries, handlers, pi, runReview, sent };
}

function context(entries = []) {
  return {
    cwd: "/repo",
    model: { provider: "openai-codex", id: "gpt-5.5" },
    thinkingLevel: "high",
    signal: undefined,
    sessionManager: { getBranch: () => entries },
    waitForIdle: vi.fn(),
  };
}

describe("independent review guard", () => {
  it("registers the existing command and task-level lifecycle hooks", () => {
    const harness = makeHarness();

    expect(harness.commands.has("consult:self-review")).toBe(true);
    expect(harness.handlers.has("tool_result")).toBe(true);
    expect(harness.handlers.has("agent_settled")).toBe(true);
    expect(harness.handlers.has("before_agent_start")).toBe(true);
    expect(harness.handlers.has("session_start")).toBe(true);
    expect(harness.handlers.has("message_end")).toBe(false);
  });

  it("spawns a fresh reviewer after successful production changes settle", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("before_agent_start")({ prompt: "Implement the cache" }, ctx);
    await harness.handlers.get("tool_result")(
      { toolName: "write", input: { path: "src/cache.ts" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/repo",
        model: "openai-codex/gpt-5.5",
        thinkingLevel: "high",
        changedPaths: ["src/cache.ts"],
        intent: "Implement the cache",
      }),
    );
    expect(harness.sent).toHaveLength(1);
    expect(harness.sent[0].message.content).toContain(SELF_REVIEW_MARKER);
    expect(harness.sent[0].message.content).toContain("No findings.");
    expect(harness.sent[0].options).toEqual({ triggerTurn: true, deliverAs: "followUp" });
  });

  it("does not accept ordinary proof wording as an independent review", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")(
      { toolName: "edit", input: { path: "src/cache.ts" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).toHaveBeenCalledTimes(1);
  });

  it("reviews each corrective mutation with a new agent", async () => {
    const runReview = vi
      .fn()
      .mockResolvedValueOnce({ output: "Warning: fix src/cache.ts:4" })
      .mockResolvedValueOnce({ output: "No findings." });
    const harness = makeHarness(runReview);
    const ctx = context();

    await harness.handlers.get("tool_result")(
      { toolName: "write", input: { path: "src/cache.ts" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);
    await harness.handlers.get("agent_settled")({}, ctx);
    expect(runReview).toHaveBeenCalledTimes(1);

    await harness.handlers.get("tool_result")(
      { toolName: "edit", input: { path: "src/cache.ts" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(runReview).toHaveBeenCalledTimes(2);
  });

  it("ignores docs, failed writes, and review subprocess messages", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")(
      { toolName: "write", input: { path: "README.md" }, isError: false },
      ctx,
    );
    await harness.handlers.get("tool_result")(
      { toolName: "write", input: { path: "src/cache.ts" }, isError: true },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).not.toHaveBeenCalled();
  });

  it("ignores shell redirects that do not write production files", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")(
      { toolName: "bash", input: { command: "pnpm test 2>&1 | tail -30" }, isError: false },
      ctx,
    );
    await harness.handlers.get("tool_result")(
      { toolName: "bash", input: { command: "git diff > /dev/null" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).not.toHaveBeenCalled();
  });

  it("caps automatic review rounds for repeated corrective mutations", async () => {
    const runReview = vi.fn().mockResolvedValue({ output: "Warning: still found a nit" });
    const harness = makeHarness(runReview);
    const ctx = context();

    for (let index = 0; index < 4; index += 1) {
      await harness.handlers.get("tool_result")(
        { toolName: "edit", input: { path: "src/cache.ts" }, isError: false },
        ctx,
      );
      await harness.handlers.get("agent_settled")({}, ctx);
    }

    expect(runReview).toHaveBeenCalledTimes(3);
    expect(harness.sent.at(-1).message.content).toMatch(/review limit/i);
  });

  it("resets the automatic review budget when a new user task starts", async () => {
    const runReview = vi.fn().mockResolvedValue({ output: "Warning: still found a nit" });
    const harness = makeHarness(runReview);
    const ctx = context();

    for (let index = 0; index < 4; index += 1) {
      await harness.handlers.get("tool_result")({ toolName: "edit", input: { path: "src/cache.ts" }, isError: false }, ctx);
      await harness.handlers.get("agent_settled")({}, ctx);
    }
    expect(runReview).toHaveBeenCalledTimes(3);

    await harness.handlers.get("before_agent_start")({ prompt: "Now add the store" }, ctx);
    await harness.handlers.get("tool_result")({ toolName: "write", input: { path: "src/store.ts" }, isError: false }, ctx);
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(runReview).toHaveBeenCalledTimes(4);
    expect(runReview.mock.calls.at(-1)[0].intent).toBe("Now add the store");
  });

  it("still detects write verbs when a redirect only targets a log or /dev/null", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")({ toolName: "bash", input: { command: "cp a src/b.ts 2>&1" }, isError: false }, ctx);
    await harness.handlers.get("tool_result")(
      { toolName: "bash", input: { command: "sed -i 's/a/b/' src/x.ts > /dev/null" }, isError: false },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).toHaveBeenCalledTimes(1);
    expect(harness.runReview.mock.calls[0][0].changedPaths).toEqual(["<shell mutation>"]);
  });

  it("ignores redirects into log and scratch files", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")({ toolName: "bash", input: { command: "pnpm test > out.log" }, isError: false }, ctx);
    await harness.handlers.get("tool_result")({ toolName: "bash", input: { command: "pnpm test | tee run.txt" }, isError: false }, ctx);
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).not.toHaveBeenCalled();
  });

  it("recognizes PowerShell production writes", async () => {
    const harness = makeHarness();
    const ctx = context();

    await harness.handlers.get("tool_result")(
      {
        toolName: "powershell",
        input: { command: "Set-Content -Path src/cache.ts -Value 'x'" },
        isError: false,
      },
      ctx,
    );
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).toHaveBeenCalledTimes(1);
  });

  it("restores branch-local dirty state after reload", async () => {
    const harness = makeHarness();
    const restored = [
      {
        type: "custom",
        customType: REVIEW_STATE_ENTRY,
        data: { generation: 2, reviewedGeneration: 1, changedPaths: ["src/cache.ts"], intent: "Fix cache" },
      },
    ];
    const ctx = context(restored);

    await harness.handlers.get("session_start")({}, ctx);
    await harness.handlers.get("agent_settled")({}, ctx);

    expect(harness.runReview).toHaveBeenCalledWith(
      expect.objectContaining({ changedPaths: ["src/cache.ts"], intent: "Fix cache" }),
    );
  });
});
