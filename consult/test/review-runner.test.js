import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildReviewerArgs, finalAssistantText, readReviewDiff } from "../src/review/review-runner.ts";

describe("independent reviewer process contract", () => {
  it("starts a sessionless isolated Pi process with read-only tools", () => {
    const args = buildReviewerArgs({
      model: "openai-codex/gpt-5.5",
      thinkingLevel: "high",
      skillPath: "/consult/skills/code-review/SKILL.md",
      prompt: "Review this diff",
    });

    expect(args).toContain("--no-session");
    expect(args).toContain("--no-extensions");
    expect(args).toContain("--no-skills");
    expect(args).toContain("/consult/skills/code-review/SKILL.md");
    expect(args).toContain("read,grep,find,ls");
    expect(args).not.toContain("bash");
    expect(args).not.toContain("edit");
    expect(args).not.toContain("write");
    expect(args).toContain("openai-codex/gpt-5.5");
    expect(args).toContain("high");
  });

  it("extracts the final assistant response from Pi JSON events", () => {
    const events = [
      JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "draft" }] } }),
      JSON.stringify({ type: "message_end", message: { role: "toolResult", content: [{ type: "text", text: "ignored" }] } }),
      JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: "final review" }] } }),
    ].join("\n");

    expect(finalAssistantText(events)).toBe("final review");
  });

  it("joins all text parts from the final assistant response", () => {
    const events = JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Finding" },
          { type: "text", text: " details" },
        ],
      },
    });

    expect(finalAssistantText(events)).toBe("Finding details");
  });

  it("includes untracked files in the supplied review diff", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "consult-review-"));
    try {
      execFileSync("git", ["init"], { cwd, stdio: "ignore" });
      mkdirSync(join(cwd, "src"));
      writeFileSync(join(cwd, "src", "tracked.ts"), "export const value = 1;\n");
      execFileSync("git", ["add", "src/tracked.ts"], { cwd, stdio: "ignore" });
      execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "init"], {
        cwd,
        stdio: "ignore",
      });
      writeFileSync(join(cwd, "src", "tracked.ts"), "export const value = 2;\n");
      writeFileSync(join(cwd, "src", "new.ts"), "export const added = true;\n");

      const diff = await readReviewDiff(cwd, ["src/tracked.ts", "src/new.ts"]);

      expect(diff).toContain("src/tracked.ts");
      expect(diff).toContain("src/new.ts");
      expect(diff).toContain("export const added = true");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
