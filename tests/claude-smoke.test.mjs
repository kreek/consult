import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ROOT, run } from "./helpers.mjs";
import { pickTrial, shippedSkills, skillsFromPaths, trialFeatures } from "../scripts/claude-smoke.mjs";

const SCRIPT = join(ROOT, "scripts/claude-smoke.mjs");

describe("claude-smoke skill detection", () => {
  it("maps canonical and mirrored skill paths to skill names", () => {
    expect(
      skillsFromPaths([
        "agents/.agents/skills/proof/SKILL.md",
        "plugin/skills/workflow/SKILL.md",
        "consult/skills/security/references/web-app.md",
      ]),
    ).toEqual(["proof", "security", "workflow"]);
  });

  it("ignores changes outside a skill directory", () => {
    expect(
      skillsFromPaths(["README.md", "eval/eval.config.ts", "scripts/claude-smoke.mjs", "plugin/plugin.json"]),
    ).toEqual([]);
  });

  it("deduplicates a skill edited across mirrors", () => {
    expect(
      skillsFromPaths(["agents/.agents/skills/proof/SKILL.md", "plugin/skills/proof/SKILL.md"]),
    ).toEqual(["proof"]);
  });
});

describe("claude-smoke trial selection", () => {
  it("prefers a read-only routing trial, which is the cheapest useful signal", () => {
    const picked = pickTrial(["proof"]);
    expect(picked?.routing).toBe(true);
    expect(trialFeatures(picked?.trial ?? "")).toContain("proof");
  });

  it("falls back to an implementation trial when no routing trial covers the skill", () => {
    const picked = pickTrial(["refactoring"]);
    expect(picked?.routing).toBe(false);
    expect(trialFeatures(picked?.trial ?? "")).toContain("refactoring");
  });

  it("returns nothing when no trial declares the skill, rather than running an unrelated one", () => {
    // commit, contract-first and official-source-check are shipped but appear in no
    // trial's features, so the behavioural tier has nothing to run for them.
    expect(pickTrial(["commit"])).toBeUndefined();
  });

  it("picks a trial that covers more of the changed skills over one that covers fewer", () => {
    const picked = pickTrial(["async-systems", "error-handling", "observability"]);
    const features = trialFeatures(picked?.trial ?? "");
    expect(features).toContain("async-systems");
    expect(features).toContain("observability");
  });

  it("only ever selects a trial that declares one of the changed skills", () => {
    for (const skill of shippedSkills()) {
      const picked = pickTrial([skill]);
      if (picked) expect(trialFeatures(picked.trial), skill).toContain(skill);
    }
  });
});

describe("claude-smoke CLI", () => {
  it("prints usage without launching anything", () => {
    const result = run("node", [SCRIPT, "--help"], { cwd: ROOT });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--load-only");
    expect(result.stdout).toContain("no ANTHROPIC_API_KEY");
  });

  it("rejects an unknown skill name instead of silently testing nothing", () => {
    const result = run("node", [SCRIPT, "--skill=not-a-real-skill"], { cwd: ROOT });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("unknown skill");
  });
});
