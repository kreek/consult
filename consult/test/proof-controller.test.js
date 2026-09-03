import { describe, expect, it, vi } from "vitest";

import { createProofController, isFullSuiteCommand } from "../src/proof/proof-controller.ts";

const readTestScript = () => "vitest run test";

function context() {
  return {
    cwd: "/repo",
    hasUI: false,
    sessionManager: { getBranch: () => [] },
    ui: {
      notify: vi.fn(),
      setStatus: vi.fn(),
      setWidget: vi.fn(),
    },
  };
}

function toolResult(toolName, input, isError = false) {
  return { toolName, input, isError, content: [{ type: "text", text: "ok" }] };
}

describe("proof controller lifecycle", () => {
  it("blocks production writes until a failing proof and tests one completed mutation batch", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, output: "1 failed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "1 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    expect(controller.getPhase()).toBe("specifying");
    expect(controller.handleProductionWrite("src/cache.ts", ctx)).toMatchObject({ block: true });

    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    expect(runTestCommand).not.toHaveBeenCalled();
    await controller.flushPendingTests(ctx);
    expect(runTestCommand).toHaveBeenCalledTimes(1);
    expect(controller.getPhase()).toBe("implementing");

    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.handleFileToolResult(toolResult("write", { path: "src/helper.ts" }), ctx);
    expect(runTestCommand).toHaveBeenCalledTimes(1);
    await controller.flushPendingTests(ctx);

    expect(runTestCommand).toHaveBeenCalledTimes(2);
    expect(controller.getPhase()).toBe("refactoring");
  });

  it("iterates with the known failing Vitest test before widening", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({
        passed: false,
        output: "✗ test/cache.test.ts > cache > returns cached value 5360ms\n1 failed",
        durationMs: 5,
      })
      .mockResolvedValueOnce({ passed: true, output: "✓ test/cache.test.ts > cache > returns cached value\n1 passed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "63 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    expect(runTestCommand.mock.calls[0][0]).toBe("pnpm test");
    expect(runTestCommand.mock.calls[1][0]).toBe("pnpm test test/cache.test.ts -t 'returns cached value'");
    expect(controller.getPhase()).toBe("refactoring");
    expect(controller.complete(ctx)).toEqual({ ok: false, message: expect.stringMatching(/full suite/i) });

    await controller.handleManualTestRun(
      { ...toolResult("bash", { command: "pnpm test" }), content: [{ type: "text", text: "63 passed" }] },
      ctx,
    );
    expect(controller.complete(ctx)).toEqual({ ok: true, message: "Proof completed" });
  });

  it("falls back to the configured command when the failed test cannot be focused safely", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, output: "1 failed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "1 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "make test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    expect(runTestCommand.mock.calls.map((call) => call[0])).toEqual(["make test", "make test"]);
  });

  it("does not enter refactoring when a focused command reports a vacuous pass", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({
        passed: false,
        output: "✗ test/cache.test.ts > cache > returns [] 1ms\n1 failed",
        durationMs: 5,
      })
      .mockResolvedValueOnce({ passed: true, output: "0 passed\n26 skipped", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    const result = await controller.flushPendingTests(ctx);

    expect(result).toMatch(/no passing tests were observed/i);
    expect(controller.getPhase()).toBe("implementing");
  });

  it("accepts manual full-suite commands with shell decoration", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({
        passed: false,
        output: "✗ test/cache.test.ts > cache > returns cached value 5ms\n1 failed",
        durationMs: 5,
      })
      .mockResolvedValueOnce({ passed: true, output: "✓ test/cache.test.ts > cache > returns cached value\n1 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    await controller.handleManualTestRun(
      { ...toolResult("bash", { command: "cd consult && pnpm test 2>&1 | tail -30" }), content: [{ type: "text", text: "63 passed" }] },
      ctx,
    );

    expect(controller.complete(ctx)).toEqual({ ok: true, message: "Proof completed" });
  });

  it("requires fresh green evidence before proof_done", async () => {
    const controller = createProofController({
      runTestCommand: vi.fn().mockResolvedValue({ passed: false, output: "1 failed", durationMs: 5 }),
    });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    expect(controller.complete(ctx)).toEqual({ ok: false, message: expect.stringMatching(/passing test/i) });
    expect(controller.getPhase()).toBe("specifying");

    expect(controller.cancel(ctx)).toEqual({ ok: true, message: "Proof cancelled" });
    expect(controller.getPhase()).toBe("off");
  });

  it("keeps refactoring active until completion instead of resetting on the next model turn", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, output: "1 failed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "1 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("write", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    controller.handleTurnStart?.(ctx);
    expect(controller.getPhase()).toBe("refactoring");
    expect(controller.complete(ctx)).toEqual({ ok: true, message: "Proof completed" });
  });

  it("does not accept a manual targeted run as full-suite evidence", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, output: "✗ test/cache.test.ts > cache > returns cached value 5ms\n1 failed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "✓ test/cache.test.ts > cache > returns cached value\n1 passed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    await controller.handleManualTestRun(
      { ...toolResult("bash", { command: "pnpm test test/cache.test.ts" }), content: [{ type: "text", text: "5 passed" }] },
      ctx,
    );
    expect(controller.complete(ctx)).toEqual({ ok: false, message: expect.stringMatching(/full suite/i) });

    await controller.handleManualTestRun(
      { ...toolResult("bash", { command: "pnpm test -t cache" }), content: [{ type: "text", text: "5 passed" }] },
      ctx,
    );
    expect(controller.complete(ctx)).toEqual({ ok: false, message: expect.stringMatching(/full suite/i) });
  });

  it("widens to the configured command after a vacuous focused pass", async () => {
    const runTestCommand = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, output: "✗ test/cache.test.ts > cache > returns [] 1ms\n1 failed", durationMs: 5 })
      .mockResolvedValueOnce({ passed: true, output: "26 skipped", durationMs: 5 })
      .mockResolvedValueOnce({ passed: false, output: "1 failed", durationMs: 5 });
    const controller = createProofController({ runTestCommand, readTestScript });
    const ctx = context();

    await controller.enable(ctx, { command: "pnpm test", cwd: "/repo" });
    await controller.handleFileToolResult(toolResult("write", { path: "test/cache.test.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);
    await controller.handleFileToolResult(toolResult("edit", { path: "src/cache.ts" }), ctx);
    await controller.flushPendingTests(ctx);

    expect(runTestCommand.mock.calls.map((call) => call[0])).toEqual([
      "pnpm test",
      "pnpm test test/cache.test.ts -t 'returns \\[\\]'",
      "pnpm test",
    ]);
  });
});

describe("full-suite command detection", () => {
  it("accepts the configured command with shell decoration only", () => {
    expect(isFullSuiteCommand("pnpm test", "pnpm test")).toBe(true);
    expect(isFullSuiteCommand("cd consult && pnpm test 2>&1 | tail -30", "pnpm test")).toBe(true);
    expect(isFullSuiteCommand("CI=1 pnpm test > out.log", "pnpm test")).toBe(true);
    expect(isFullSuiteCommand("pnpm test; echo done", "pnpm test")).toBe(true);
  });

  it("rejects any extra arguments after the configured command", () => {
    expect(isFullSuiteCommand("pnpm test test/cache.test.ts", "pnpm test")).toBe(false);
    expect(isFullSuiteCommand("pnpm test -t cache | tail", "pnpm test")).toBe(false);
    expect(isFullSuiteCommand("pnpm test -- --reporter dot", "pnpm test")).toBe(false);
    expect(isFullSuiteCommand("make lint", "pnpm test")).toBe(false);
    expect(isFullSuiteCommand(undefined, "pnpm test")).toBe(false);
  });
});
