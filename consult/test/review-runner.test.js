import { describe, expect, it } from "vitest";

import { buildReviewerArgs, finalAssistantText } from "../src/review/review-runner.ts";

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
});
