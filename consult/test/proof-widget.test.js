import { describe, expect, it } from "vitest";

import { renderWidget } from "../src/proof/proof-widget.ts";

const theme = {
  bold: (text) => text,
  fg: (_color, text) => text,
};

describe("proof widget", () => {
  it("collapses the test list after all tests pass", () => {
    const lines = renderWidget(
      {
        activeTestRun: undefined,
        cycleCount: 1,
        phase: "implementing",
        summary: {
          passed: 24,
          failed: 0,
          duration: "3.81s",
          tests: [
            { name: "tests/consult-header.test.mjs (4 tests) 3ms", passed: true },
            { name: "tests/pi-local-yeet-command.test.mjs (5 tests) 2ms", passed: true },
          ],
        },
      },
      theme,
      80,
    );

    expect(lines).toContain("  24 passed | 3.81s");
    expect(lines.join("\n")).not.toContain("tests/consult-header.test.mjs");
    expect(lines.join("\n")).not.toContain("tests/pi-local-yeet-command.test.mjs");
  });

  it("keeps the failing test list visible when proof is not valid", () => {
    const lines = renderWidget(
      {
        activeTestRun: undefined,
        cycleCount: 1,
        phase: "implementing",
        summary: {
          passed: 1,
          failed: 1,
          duration: "1.2s",
          tests: [
            { name: "passes.test.js", passed: true },
            { name: "fails.test.js", passed: false },
          ],
        },
      },
      theme,
      80,
    );

    expect(lines.join("\n")).toContain("fails.test.js");
    expect(lines.join("\n")).toContain("passes.test.js");
  });
});
