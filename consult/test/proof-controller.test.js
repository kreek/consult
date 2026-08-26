import { describe, expect, it, vi } from "vitest";

import { createProofController } from "../src/proof/proof-controller.ts";

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
    const controller = createProofController({ runTestCommand });
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
    const controller = createProofController({ runTestCommand });
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
});
