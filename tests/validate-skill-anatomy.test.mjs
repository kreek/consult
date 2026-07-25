import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupTempDir, makeTempDir, ROOT, run } from "./helpers.mjs";

const SCRIPT = join(ROOT, "scripts/validate-skill-anatomy.mjs");

const GOOD_SKILL = `---
name: good
description: Good test skill
---

# Good

## When to Use

- trigger
- one change per commit

## When NOT to Use

- other

## Verification

- [ ] check

## Workflow

1. Do the first relevant action.
2. Run the smallest check that proves the claim.
3. Report the evidence and any blocker.
4. Keep changes scoped to the request.

## Tripwires

- Run the check before making a completion claim.
- Mark research notes as non-completion claims.
`;

const BAD_SKILL = `---
name: bad
description: Bad test skill
---

# Bad

Per Rich Hickey, prefer values over places.

## Overview

Stuff.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "Should work" | It might not. |

## Red Flags

- "Probably fine"
`;

const LONG_TRIPWIRES_SKILL = `---
name: long-tripwires
description: Long tripwire table
---

# Long Tripwires

## When to Use

- trigger

## When NOT to Use

- other

## Verification

- [ ] check

## Tripwires

- Use the skill when the shortcut appears.
- Keep the corrective action positive.
- Move rare exceptions to references.
- Keep this list shorter than the main guidance.
- Omit this section when no row pays for its tokens.
`;

let tmp;

function runScript(...args) {
  return run("node", [SCRIPT, ...args], { cwd: ROOT });
}

function makeSkill(skillsDir, name, body = GOOD_SKILL) {
  const skill = join(skillsDir, name);
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), body, "utf8");
  return skill;
}

function makeCodexPluginPackage(
  root,
  {
    includeMarketplace = true,
    includeManifest = true,
    marketplaceSourcePath = "./plugin",
    includePolicy = true,
    includeCategory = true,
    manifestSkillsPath = "./skills/",
    includeCodexHooksField = false,
    includeClaudeHooksField = false,
    includeCursorHooksField = false,
    codexVersion = "2.0.0",
    claudeMarketplaceVersion = "2.0.0",
    claudeEntryVersion = "2.0.0",
    claudeManifestVersion = "2.0.0",
  } = {},
) {
  if (includeMarketplace) {
    const entry = {
      name: "consult",
      source: { source: "local", path: marketplaceSourcePath },
    };
    if (includePolicy) entry.policy = { installation: "AVAILABLE", authentication: "ON_INSTALL" };
    if (includeCategory) entry.category = "Coding";
    const marketplace = {
      name: "consult",
      interface: { displayName: "Consult" },
      plugins: [entry],
    };
    const marketplacePath = join(root, ".agents/plugins/marketplace.json");
    mkdirSync(join(root, ".agents/plugins"), { recursive: true });
    writeFileSync(marketplacePath, JSON.stringify(marketplace), "utf8");
  }

  if (includeManifest) {
    const manifest = {
      name: "consult",
      version: codexVersion,
      skills: manifestSkillsPath,
      interface: {
        displayName: "Consult",
        category: "Coding",
        capabilities: ["Read", "Write"],
        defaultPrompt: ["Use Consult workflow for this engineering task."],
      },
    };
    if (includeCodexHooksField) manifest.hooks = "./hooks.json";
    mkdirSync(join(root, "plugin/.codex-plugin"), { recursive: true });
    writeFileSync(join(root, "plugin/.codex-plugin/plugin.json"), JSON.stringify(manifest), "utf8");

    const claudeMarketplace = {
      name: "consult",
      metadata: { version: claudeMarketplaceVersion },
      plugins: [{ name: "consult", version: claudeEntryVersion, source: "./plugin" }],
    };
    mkdirSync(join(root, ".claude-plugin"), { recursive: true });
    writeFileSync(join(root, ".claude-plugin/marketplace.json"), JSON.stringify(claudeMarketplace), "utf8");

    const claudeManifest = {
      name: "consult",
      version: claudeManifestVersion,
    };
    if (includeClaudeHooksField) {
      claudeManifest.hooks = {
        Stop: [
          {
            matcher: "*",
            hooks: [
              {
                type: "command",
                command: "node ${CLAUDE_PLUGIN_ROOT}/scripts/self-review.mjs",
                timeout: 5,
              },
            ],
          },
        ],
      };
    }
    mkdirSync(join(root, "plugin/.claude-plugin"), { recursive: true });
    writeFileSync(join(root, "plugin/.claude-plugin/plugin.json"), JSON.stringify(claudeManifest), "utf8");

    const cursorMarketplace = {
      name: "consult",
      owner: { name: "Alastair Dawson", url: "https://github.com/kreek" },
      metadata: { version: claudeMarketplaceVersion },
      plugins: [{ name: "consult", version: claudeEntryVersion, source: "./plugin" }],
    };
    mkdirSync(join(root, ".cursor-plugin"), { recursive: true });
    writeFileSync(join(root, ".cursor-plugin/marketplace.json"), JSON.stringify(cursorMarketplace), "utf8");

    const cursorManifest = {
      name: "consult",
      version: claudeManifestVersion,
      skills: manifestSkillsPath,
    };
    if (includeCursorHooksField) cursorManifest.hooks = "./hooks.json";
    mkdirSync(join(root, "plugin/.cursor-plugin"), { recursive: true });
    writeFileSync(join(root, "plugin/.cursor-plugin/plugin.json"), JSON.stringify(cursorManifest), "utf8");
  }
}

function makeAntigravityPluginPackage(root, { name = "consult", includeManifest = true } = {}) {
  if (!includeManifest) return;
  writeFileSync(join(root, "plugin/plugin.json"), JSON.stringify({ name }), "utf8");
}

describe("validate-skill-anatomy CLI", () => {
  afterEach(() => {
    if (tmp) cleanupTempDir(tmp);
    tmp = undefined;
  });

  it("runs its self-test successfully", () => {
    const result = runScript("--self-test");

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("self-test ok");
  });

  it("passes when skill anatomy and plugin mirror are valid", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    for (const dest of ["plugin/skills", "consult/skills"]) {
      mkdirSync(join(tmp, dest), { recursive: true });
      cpSync(join(skillsDir, "good"), join(tmp, dest, "good"), { recursive: true });
    }
    makeCodexPluginPackage(tmp);
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("all skills conform to the anatomy");
    expect(result.stdout).toContain("plugin/skills mirror in sync with source");
    expect(result.stdout).toContain("consult/skills mirror in sync with source");
    expect(result.stdout).toContain("codex plugin package valid");
    expect(result.stdout).toContain("cursor plugin package valid");
    expect(result.stdout).toContain("antigravity plugin package valid");
    expect(readFileSync(join(tmp, "plugin/skills/good/SKILL.md"), "utf8")).toBe(
      readFileSync(join(skillsDir, "good/SKILL.md"), "utf8"),
    );
  });

  it("reports skill anatomy findings", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "bad", BAD_SKILL);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("bad/SKILL.md");
    expect(result.stdout).toContain("missing section: ## When to Use");
    expect(result.stdout).toContain("missing section: ## Verification");
    expect(result.stdout).toContain("inline 'per <expert>' attribution found");
    expect(result.stdout).toContain("obsolete section: ## Common Rationalizations");
    expect(result.stdout).toContain("obsolete section: ## Red Flags");
    expect(result.stdout).toContain("obsolete table header");
    expect(result.stdout).toContain("1 skill(s) failed anatomy validation");
  });

  it("measures a quoted description past its first inner colon", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    const description =
      "Use for design-partner mode: discovery, tradeoffs, decisions, and the agreed design artifacts that later implementation work binds itself to.";
    makeSkill(skillsDir, "quoted", GOOD_SKILL.replace("description: Good test skill", `description: "${description}"`));

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("quoted/SKILL.md");
    expect(result.stdout).toContain(`frontmatter description too long (${description.length} > 120 characters)`);
  });

  it("rejects tripwires as the longest section", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "long-tripwires", LONG_TRIPWIRES_SKILL);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("long-tripwires/SKILL.md");
    expect(result.stdout).toContain("Tripwires must not be the longest section");
  });

  it("reports plugin drift when a skill mirror is missing", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    makeCodexPluginPackage(tmp);
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("all skills conform to the anatomy");
    expect(result.stdout).toContain("plugin/skills drift:");
    expect(result.stdout).toContain("plugin/skills/good missing");
    expect(result.stdout).toContain("1 plugin/skills mirror difference(s) found");
  });

  it("reports missing Codex marketplace when plugin exists", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp, { includeMarketplace: false });
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("codex plugin:");
    expect(result.stdout).toContain("missing");
    expect(result.stdout).toContain(".agents/plugins/marketplace.json");
  });

  it("reports invalid Codex marketplace and manifest fields", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp, {
      marketplaceSourcePath: "./wrong",
      includePolicy: false,
      includeCategory: false,
      manifestSkillsPath: "./wrong/",
      includeCodexHooksField: true,
    });
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("consult.source.path must be './plugin'");
    expect(result.stdout).toContain("consult.policy must be an object");
    expect(result.stdout).toContain("consult.category must be 'Coding'");
    expect(result.stdout).toContain("skills must be './skills/'");
    expect(result.stdout).toContain("must not declare hooks");
  });

  it("reports host hook declarations because plugin packages are skills-only", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp, {
      includeCodexHooksField: true,
      includeClaudeHooksField: true,
      includeCursorHooksField: true,
    });
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("plugin/.codex-plugin/plugin.json must not declare hooks");
    expect(result.stdout).toContain("plugin/.claude-plugin/plugin.json must not declare hooks");
    expect(result.stdout).toContain("plugin/.cursor-plugin/plugin.json must not declare hooks");
  });

  it("reports plugin version drift across Claude and Codex manifests", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp, {
      codexVersion: "2.0.0",
      claudeMarketplaceVersion: "2.1.0",
      claudeEntryVersion: "2.2.0",
      claudeManifestVersion: "2.3.0",
    });
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("version must match");
    expect(result.stdout).toContain("consult.version must match metadata.version");
    expect(result.stdout).toContain("plugin/.codex-plugin/plugin.json");
    expect(result.stdout).toContain("plugin/.claude-plugin/plugin.json");
    expect(result.stdout).toContain("plugin/.cursor-plugin/plugin.json");
  });

  it("reports invalid Cursor marketplace and manifest fields", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp, { manifestSkillsPath: "./wrong/" });
    writeFileSync(
      join(tmp, ".cursor-plugin/marketplace.json"),
      JSON.stringify({
        name: "consult",
        owner: { name: "Alastair Dawson" },
        metadata: { version: "2.0.0" },
        plugins: [{ name: "consult", version: "2.0.0", source: "./wrong" }],
      }),
      "utf8",
    );
    writeFileSync(
      join(tmp, "plugin/.cursor-plugin/plugin.json"),
      JSON.stringify({ name: "consult", version: "2.0.0", skills: "./wrong/" }),
      "utf8",
    );
    makeAntigravityPluginPackage(tmp);

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(".cursor-plugin/marketplace.json consult.source must be './plugin'");
    expect(result.stdout).toContain("plugin/.cursor-plugin/plugin.json skills must be './skills/'");
  });

  it("reports invalid Google Antigravity plugin fields", () => {
    tmp = makeTempDir();
    const skillsDir = join(tmp, "agents/.agents/skills");
    makeSkill(skillsDir, "good");
    mkdirSync(join(tmp, "plugin/skills"), { recursive: true });
    cpSync(join(skillsDir, "good"), join(tmp, "plugin/skills/good"), { recursive: true });
    makeCodexPluginPackage(tmp);
    makeAntigravityPluginPackage(tmp, { name: "wrong" });

    const result = runScript(skillsDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("antigravity plugin:");
    expect(result.stdout).toContain("plugin/plugin.json name must be 'consult'");
  });
});
