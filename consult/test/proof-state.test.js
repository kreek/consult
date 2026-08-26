import { describe, expect, it } from "vitest";

import { evaluateTestResult, focusedCommandForFailures } from "../src/proof/proof-state.ts";

const VITEST_SCRIPT = { testScript: "vitest run test" };

function summary(names) {
  return {
    failed: names.length,
    passed: 0,
    tests: names.map((name) => ({ name, passed: false })),
  };
}

describe("focused proof commands", () => {
  it("runs a single known Vitest failure by test name", () => {
    expect(
      focusedCommandForFailures(
        "pnpm test",
        summary(["test/cache.test.ts > cache > returns cached value 5360ms"]),
        VITEST_SCRIPT,
      ),
    ).toBe("pnpm test test/cache.test.ts -t 'returns cached value'");
  });

  it("runs multiple known failures in one file at file scope", () => {
    expect(
      focusedCommandForFailures(
        "pnpm test",
        summary([
          "test/cache.test.ts > cache > returns cached value",
          "test/cache.test.ts > cache > expires stale value",
        ]),
        VITEST_SCRIPT,
      ),
    ).toBe("pnpm test test/cache.test.ts");
  });

  it("runs multiple known failures across files by file set", () => {
    expect(
      focusedCommandForFailures(
        "pnpm test",
        summary([
          "test/cache.test.ts > cache > returns cached value",
          "test/store.test.ts > store > persists value",
        ]),
        VITEST_SCRIPT,
      ),
    ).toBe("pnpm test test/cache.test.ts test/store.test.ts");
  });

  it("places focused args after package-manager test scripts with the right separator", () => {
    expect(
      focusedCommandForFailures(
        "pnpm --dir consult test",
        summary(["test/cache.test.ts > cache > returns cached value"]),
        VITEST_SCRIPT,
      ),
    ).toBe("pnpm --dir consult test test/cache.test.ts -t 'returns cached value'");

    expect(
      focusedCommandForFailures(
        "npm --workspace consult test",
        summary(["test/cache.test.ts > cache > returns cached value"]),
        VITEST_SCRIPT,
      ),
    ).toBe("npm --workspace consult test -- test/cache.test.ts -t 'returns cached value'");
  });

  it("uses Windows-compatible quoting for focused test names on Windows", () => {
    expect(
      focusedCommandForFailures(
        "pnpm test",
        summary(["test/cache.test.ts > cache > returns user's cached value"]),
        { platform: "win32", ...VITEST_SCRIPT },
      ),
    ).toBe('pnpm test test/cache.test.ts -t "returns user\'s cached value"');
  });

  it("does not focus commands that are not recognised JavaScript runners", () => {
    expect(
      focusedCommandForFailures(
        "make test",
        summary(["test/cache.test.ts > cache > returns cached value"]),
        VITEST_SCRIPT,
      ),
    ).toBeUndefined();
  });

  it("escapes test names because -t is a regex", () => {
    expect(
      focusedCommandForFailures(
        "pnpm test",
        summary(["test/cache.test.ts > cache > returns 0 for [] input and supports a+b"]),
        VITEST_SCRIPT,
      ),
    ).toBe("pnpm test test/cache.test.ts -t 'returns 0 for \\[\\] input and supports a\\+b'");
  });

  it("derives the failed test file from Vitest's file summary line", () => {
    const result = evaluateTestResult({
      command: "pnpm test",
      passed: false,
      phase: "specifying",
      ...VITEST_SCRIPT,
      output: [
        "❯ test/proof-controller.test.js (5 tests | 1 failed) 12ms",
        "  × proof controller lifecycle > iterates with the known failing Vitest test before widening 5ms",
        "1 failed",
      ].join("\n"),
    });

    expect(result.focusCommand).toBe(
      "pnpm test test/proof-controller.test.js -t 'iterates with the known failing Vitest test before widening'",
    );
  });

  it("does not focus package-manager test scripts unless the script is a bare Vitest or Jest call", () => {
    const failure = summary(["test/cache.test.ts > cache > returns cached value"]);

    expect(focusedCommandForFailures("pnpm test", failure, { testScript: "vitest run && tsc --noEmit" })).toBeUndefined();
    expect(focusedCommandForFailures("pnpm test", failure, { testScript: "mocha test" })).toBeUndefined();
    expect(focusedCommandForFailures("pnpm test", failure)).toBeUndefined();
    expect(focusedCommandForFailures("npm test", failure, { testScript: "jest" })).toBe(
      "npm test -- test/cache.test.ts -t 'returns cached value'",
    );
  });

  it("focuses direct runner invocations without a package script", () => {
    const failure = summary(["test/cache.test.ts > cache > returns cached value"]);

    expect(focusedCommandForFailures("pnpm vitest run", failure)).toBe("pnpm vitest run test/cache.test.ts -t 'returns cached value'");
    expect(focusedCommandForFailures("pnpm exec vitest", failure)).toBe("pnpm exec vitest test/cache.test.ts -t 'returns cached value'");
    expect(focusedCommandForFailures("npx jest", failure)).toBe("npx jest test/cache.test.ts -t 'returns cached value'");
  });

  it("clears the focus after a vacuous pass so the next run widens", () => {
    const result = evaluateTestResult({ command: "pnpm test", passed: true, phase: "implementing", output: "26 skipped" });

    expect(result.clearFocus).toBe(true);
    expect(result.nextPhase).toBeUndefined();
    expect(result.appendText).toMatch(/configured test command/i);
  });
});
