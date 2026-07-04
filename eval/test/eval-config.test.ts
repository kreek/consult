import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadFileSuites, readTrialManifest, type EvalSession, type VerifyResult } from "do-eval";
import { describe, expect, it } from "vitest";
import config from "../eval.config.js";
import maturityPlugin, {
  countQuestionMessages,
  extractFinalAssistantText,
  extractInitialUserPrompt,
} from "../plugins/engineering-maturity.js";

const evalDir = path.resolve(import.meta.dirname, "..");
const expectedReadmeSkills = [
  "workflow",
  "proof",
  "specify",
  "domain-modeling",
  "architecture",
  "code-review",
  "debugging",
  "refactoring",
  "error-handling",
  "security",
  "database",
  "release",
  "observability",
  "async-systems",
  "performance",
  "api",
  "documentation",
  "ui-design",
  "accessibility",
  "git-workflow",
  "scaffolding",
] as const;
const checkedFixtureExtensions = new Set([".html", ".js", ".json", ".md", ".sql", ".txt", ".ts"]);
const suites = loadFileSuites(evalDir);
const profiles = config.profiles ?? {};
const coreTrials = new Set([
  "proof-first-bugfix",
  "security-boundary-fix",
  "design-decision-record",
  "debugging-regression",
]);

function getSuite(name: string) {
  const suite = suites.find((entry) => entry.name === name)?.trials;
  if (!suite) throw new Error(`Expected suite ${name}`);
  return suite;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectCheckedFiles(root: string, current = root, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      collectCheckedFiles(root, fullPath, files);
    } else if (entry.isFile() && checkedFixtureExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function expectNeutralFixtureContent(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");
  for (const skill of expectedReadmeSkills) {
    expect(content, filePath).not.toMatch(new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i"));
  }
  expect(content, filePath).not.toMatch(/\b(Consult|Consult|skills?)\b/i);
  // Match the brand acronym case-sensitively so the common English word "consult" does not trip the guard.
  expect(content, filePath).not.toMatch(/\bHAS\b/);
}

function messageLine(role: "user" | "assistant", text: string): string {
  return JSON.stringify({
    type: "message",
    message: {
      role,
      content: [{ type: "text", text }],
    },
  });
}

function stubSession(rawLines: string[], overrides: Partial<EvalSession> = {}): EvalSession {
  return {
    toolCalls: [],
    fileWrites: [],
    pluginEvents: [],
    rawLines,
    startTime: 1,
    endTime: 2,
    exitCode: 0,
    tokenUsage: { input: 0, output: 0 },
    parseWarnings: 0,
    ...overrides,
  };
}

function routingVerify(): VerifyResult {
  return { passed: true, output: "routing", metrics: { routingTrial: 1, routingCase: 1 } };
}

describe("Consult eval config", () => {
  it("defines a single Codex profile that activates Consult through strippable layers", () => {
    expect(Object.keys(profiles)).toEqual(["codexWithConsultSkills"]);
    const withConsult = profiles["codexWithConsultSkills"];
    if (!withConsult) throw new Error("Expected the Consult profile");

    // The agent is bare codex — no marketplace, no enable flag. Consult is
    // applied entirely through setup.layers, so do-eval's bareProfileOf (strips
    // layers, keeps the agent) yields a genuinely bare baseline for lift.
    expect(withConsult.agent.harness).toBe("codex");
    expect(withConsult.agent.codex?.isolateHome).toBe(true);
    expect(withConsult.agent.codex?.ignoreUserConfig).toBe(true);
    expect(withConsult.agent.codex?.pluginMarketplaces ?? []).toEqual([]);
    expect(withConsult.agent.codex?.extraArgs ?? []).not.toContain('plugins."consult@consult".enabled=true');
    expect(withConsult.agent.codex?.extraArgs).toEqual(["-c", 'model_reasoning_effort="medium"']);

    const setupLayers = withConsult.setup?.layers ?? [];
    const pluginLayer = setupLayers.find((layer) => layer.kind === "plugin");
    const skillLayer = setupLayers.find((layer) => layer.kind === "skill-library");
    expect(pluginLayer).toMatchObject({ id: "consult", kind: "plugin", mode: "install", runtime: "codex" });
    expect(skillLayer).toMatchObject({ kind: "skill-library", runtime: "codex", source: "../agents/.agents/skills" });

    const marketplaceSource = path.resolve(evalDir, pluginLayer?.source ?? "");
    expect(fs.existsSync(path.join(marketplaceSource, "plugin", ".codex-plugin", "plugin.json"))).toBe(true);
    expect(fs.existsSync(path.resolve(evalDir, skillLayer?.source ?? ""))).toBe(true);

    expect(withConsult.factors.layers).toEqual([
      expect.objectContaining({ id: "consult", kind: "plugin", runtime: "codex" }),
    ]);
    expect(withConsult.factors["reasoningEffort"]).toBe("medium");
    expect(config.defaultProfile).toBe("codexWithConsultSkills");
    expect(config.defaultLaunchType).toBe("suite");
    expect(config.judge?.thinking).toBe("medium");
  });

  it("defines lightweight, core, and all-skills suites", () => {
    expect(suites.map((suite) => suite.name).sort()).toEqual([
      "allSkills",
      "core",
      "engineeringMaturity",
      "largeProject",
      "linkShortener",
      "regressionCheck",
      "routing",
      "smoke",
    ]);

    const smoke = getSuite("smoke");
    const core = getSuite("core");
    const allSkills = getSuite("allSkills");

    expect(smoke.length).toBeLessThan(core.length);
    expect(core.length).toBeLessThan(allSkills.length);
    expect(core.every((entry) => coreTrials.has(entry.trial))).toBe(true);
    expect(new Set(core.map((entry) => entry.trial))).toEqual(
      new Set(["proof-first-bugfix", "security-boundary-fix", "design-decision-record", "debugging-regression"]),
    );
    expect(getSuite("engineeringMaturity")).toEqual(allSkills);
    expect(getSuite("routing").map((entry) => entry.trial)).toEqual([
      "routing-checkout-payment",
      "routing-worker-retry",
      "routing-settings-copy",
      "routing-customer-email-migration",
    ]);
    expect(getSuite("largeProject")).toEqual([
      { trial: "large-checkout-workflow", variant: "default" },
      { trial: "large-link-shortener", variant: "default" },
    ]);
    for (const entry of allSkills) {
      expect(entry.variant).toBe("default");
    }
  });

  it("uses YAML manifests and the standard do-eval launcher contract", () => {
    for (const suite of suites) {
      expect(suite.trials.length, suite.name).toBeGreaterThan(0);
      for (const entry of suite.trials) {
        expect(entry).toEqual(
          expect.objectContaining({
            trial: expect.any(String),
            variant: "default",
          }),
        );
        expect(fs.existsSync(path.join(evalDir, "trials", entry.trial, "trial.yaml"))).toBe(true);
        expect(fs.existsSync(path.join(evalDir, "trials", entry.trial, "config.ts"))).toBe(false);
      }
    }

    expect(fs.existsSync(path.join(evalDir, "eval.ts"))).toBe(false);
    expect(fs.existsSync(path.join(evalDir, "framework.ts"))).toBe(false);
    expect(fs.existsSync(path.join(evalDir, "types.ts"))).toBe(false);
  });

  it("covers every README skill without putting skill names in trial prompts or starter files", () => {
    const allSkills = getSuite("allSkills");
    const trialSkills = allSkills.map((entry) => ({
      trial: entry.trial,
      skills: readTrialManifest(evalDir, entry.trial).features ?? [],
    }));
    const coveredSkills = new Set(trialSkills.flatMap((entry) => entry.skills));
    for (const skill of expectedReadmeSkills) {
      expect(coveredSkills.has(skill), `missing suite coverage for ${skill}`).toBe(true);
    }
    expect(trialSkills.filter((entry) => entry.skills.includes("workflow")).length).toBeGreaterThanOrEqual(4);
    expect(trialSkills.filter((entry) => entry.skills.includes("proof")).length).toBeGreaterThanOrEqual(4);
    for (const { trial, skills } of trialSkills) {
      expect(skills.length, `${trial} must declare intended skill coverage`).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(expectedReadmeSkills, `${trial} declares unknown skill ${skill}`).toContain(skill);
      }
    }

    for (const entry of allSkills) {
      const taskPath = path.join(evalDir, "trials", entry.trial, "task.md");
      expectNeutralFixtureContent(taskPath);
      for (const fixturePath of collectCheckedFiles(path.join(evalDir, "trials", entry.trial, "scaffold"))) {
        expectNeutralFixtureContent(fixturePath);
      }
    }
  });

  it("keeps routing trial prompts neutral and read-only", () => {
    for (const entry of getSuite("routing")) {
      const trialDir = path.join(evalDir, "trials", entry.trial);
      expectNeutralFixtureContent(path.join(trialDir, "task.md"));
      for (const fixturePath of collectCheckedFiles(path.join(trialDir, "scaffold"))) {
        expectNeutralFixtureContent(fixturePath);
      }

      const marker = JSON.parse(fs.readFileSync(path.join(trialDir, "scaffold", ".has-eval-kind.json"), "utf-8")) as {
        kind?: unknown;
      };
      expect(marker).toEqual({ kind: "routing", case: expect.any(Number) });
      expect(fs.existsSync(path.join(trialDir, "scaffold", "package.json"))).toBe(false);
    }
  });

  it("keeps implementation prompts from naming hidden-check literals", () => {
    const hiddenCheckSpoilers = [
      /aria-live/i,
      /role=["']status["']/i,
      /protocol-relative/i,
      /javascript:/i,
      /__proto__/i,
      /constructor\.prototype/i,
      /create\s+unique\s+index\s+concurrently/i,
      /Object\.prototype/i,
      /maxActive/i,
      /missing_id/i,
      /not_found/i,
    ];

    for (const entry of getSuite("allSkills").filter((trial) => !trial.trial.startsWith("routing-"))) {
      const task = fs.readFileSync(path.join(evalDir, "trials", entry.trial, "task.md"), "utf-8");
      for (const spoiler of hiddenCheckSpoilers) {
        expect(task, `${entry.trial} leaked ${spoiler}`).not.toMatch(spoiler);
      }
    }
  });

  it("ships trial scaffolds that start with passing visible tests and failing hidden checks", { timeout: 30_000 }, () => {
    const executableTrials = [...getSuite("allSkills"), ...getSuite("largeProject")];
    for (const { trial } of executableTrials) {
      const scaffold = path.join(evalDir, "trials", trial, "scaffold");
      expect(fs.existsSync(path.join(evalDir, "trials", trial, "task.md"))).toBe(true);
      expect(fs.existsSync(path.join(scaffold, "package.json"))).toBe(true);
      expect(fs.existsSync(path.join(scaffold, "test")) || fs.existsSync(path.join(scaffold, "public"))).toBe(true);

      const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `has-eval-${trial}-`));
      try {
        fs.cpSync(scaffold, workDir, { recursive: true });
        const verify = maturityPlugin.verify?.(workDir);
        expect(verify?.passed).toBe(false);
        expect(verify?.metrics["visiblePassed"]).toBe(1);
        expect(verify?.metrics["hiddenPassed"]).toBe(0);
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    }
  });

  it("keeps generic runner code out of the Consult eval project", () => {
    expect(fs.existsSync(path.join(evalDir, "eval.ts"))).toBe(false);
    expect(fs.existsSync(path.join(evalDir, "framework.ts"))).toBe(false);
    expect(fs.existsSync(path.join(evalDir, "types.ts"))).toBe(false);
  });

  it("classifies test and source writes for deterministic proof scoring", () => {
    expect(maturityPlugin.classifyFile?.("test/cart.test.js")).toBe("test");
    expect(maturityPlugin.classifyFile?.("src/cart.js")).toBe("source");
    expect(maturityPlugin.classifyFile?.("README.md")).toBe("documentation");
  });

  it("extracts final assistant text from session lines for read-only routing scoring", () => {
    const rawLines = [
      messageLine("user", "# Checkout Payment Change Triage\n\nDo not edit files."),
      messageLine("assistant", "First draft"),
      messageLine("assistant", "Final routing note"),
    ];

    expect(extractInitialUserPrompt(rawLines)).toContain("Checkout Payment Change Triage");
    expect(extractFinalAssistantText(rawLines)).toBe("Final routing note");
  });

  it("extracts final assistant text from Codex agent-message events", () => {
    const rawLines = [
      JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Intermediate note" } }),
      JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Final Codex note" } }),
    ];

    expect(extractFinalAssistantText(rawLines)).toBe("Final Codex note");
  });

  it("limits routing deterministic scoring to objective harness facts", () => {
    const finalAnswer = "A human judge should evaluate this readiness note's content.";
    const session = stubSession([
      messageLine("user", "# Checkout Payment Change Triage\n\nDo not edit files."),
      messageLine("assistant", finalAnswer),
    ]);

    const result = maturityPlugin.scoreSession(session, routingVerify());

    expect(result.scores["no_file_writes"]).toBe(100);
    expect(result.scores).not.toHaveProperty("baseline_isolation");
    expect(result.scores).not.toHaveProperty("consult_activation");
    expect(result.scores).not.toHaveProperty("routing");
    expect(result.scores).not.toHaveProperty("exclusions");
    expect(result.scores).not.toHaveProperty("proof_plan");
    expect(result.scores).not.toHaveProperty("actionability");
    expect(result.findings).toEqual([]);
  });

  it("keeps read-only routing file-write checks deterministic", () => {
    const finalAnswer = "A readiness note.";
    const session = stubSession([
      messageLine("user", "# Checkout Payment Change Triage\n\nDo not edit files."),
      messageLine("assistant", finalAnswer),
    ], {
      fileWrites: [{ timestamp: 1, path: "README.md", tool: "edit", labels: ["documentation"] }],
    });

    const result = maturityPlugin.scoreSession(session, routingVerify());

    expect(result.scores["no_file_writes"]).toBe(0);
    expect(result.findings).toContain("Routing trial wrote files despite being read-only.");
  });

  it("does not use skill-name counting or content regexes as routing proxies", () => {
    const finalAnswer = [
      "Goal: saved payment methods at checkout.",
      "Risk profile: payment token storage and rollout.",
      "Use workflow, proof, specify, domain-modeling, architecture, code-review, debugging, refactoring, error-handling, security, database, release, observability, async-systems, performance, api, documentation, ui-design, accessibility, git-workflow, and scaffolding.",
      "Exclude broad wallet management UX.",
      "Exclude provider abstraction.",
      "Evidence plan: tokenized payment reference contract tests, account endpoint contract checks, unauthorized cross-account negative trust-boundary cases, and flagged rollout/rollback checks.",
      "Completion loop: implement -> self-review diff -> fix findings -> proof -> final scoped claim.",
    ].join("\n");
    const session = stubSession([
      messageLine("user", "# Checkout Payment Change Triage\n\nDo not edit files."),
      messageLine("assistant", finalAnswer),
    ]);

    const result = maturityPlugin.scoreSession(session, routingVerify());

    expect(result.scores).not.toHaveProperty("proportionality");
    expect(result.scores).not.toHaveProperty("routing");
    expect(result.scores).not.toHaveProperty("exclusions");
    expect(result.scores).not.toHaveProperty("actionability");
    expect(result.findings.some((finding) => /too many skills|proportional/i.test(finding))).toBe(false);
  });

  it("scores meaningful proof for implementation trials", () => {
    const session = stubSession([], {
      fileWrites: [{ timestamp: 10, path: "src/cart.js", tool: "edit", labels: ["source"] }],
      toolCalls: [
        { timestamp: 12, name: "exec_command", arguments: { cmd: "npm test" }, resultText: "", wasBlocked: false },
      ],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.scores["proof"]).toBe(100);
    expect(result.scores).not.toHaveProperty("self_review");
    expect(result.findings).not.toContain("No post-change proof command was detected.");
    expect(result.findings).not.toContain("No behavior-relevant submitted proof was detected.");
  });

  it("does not give full proof credit for superficial test writes", () => {
    const session = stubSession([], {
      fileWrites: [
        { timestamp: 10, path: "src/cart.js", tool: "edit", labels: ["source"] },
        { timestamp: 11, path: "test/cart.test.js", tool: "edit", labels: ["test"] },
      ],
      toolCalls: [
        { timestamp: 12, name: "exec_command", arguments: { cmd: "npm test" }, resultText: "", wasBlocked: false },
      ],
    });

    const result = maturityPlugin.scoreSession(session, { passed: true, output: "ok", metrics: {} });

    expect(result.scores["proof"]).toBe(60);
    expect(result.findings).toContain("No behavior-relevant submitted proof was detected.");
  });

  it("reports Consult skill reads as a finding, not a weighted score", () => {
    const session = stubSession([], {
      toolCalls: [
        {
          timestamp: 1,
          name: "command_execution",
          arguments: { command: "/bin/zsh -lc \"sed -n '1,120p' .codex/skills/proof/SKILL.md\"" },
          resultText: "# Proof\n",
          wasBlocked: false,
        },
      ],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    // Activation is observable as a finding (correct for the layered run) and is
    // not a weighted score that would otherwise tank the bare baseline's overall.
    expect(result.findings).toContain("Activated 1 Consult skill: proof.");
    expect(result.scores).not.toHaveProperty("consult_activation");
    expect(result.scores).not.toHaveProperty("baseline_isolation");
  });

  it("stays silent on activation when no Consult skills are read (the bare baseline)", () => {
    const session = stubSession([], {
      toolCalls: [
        {
          timestamp: 1,
          name: "command_execution",
          arguments: { command: "/bin/zsh -lc pwd" },
          resultText: "/tmp/workdir\n",
          wasBlocked: false,
        },
      ],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.findings.some((finding) => finding.startsWith("Activated"))).toBe(false);
    expect(result.scores).not.toHaveProperty("consult_activation");
    expect(result.scores).not.toHaveProperty("baseline_isolation");
  });

  it("does not count skill loads as a deterministic score dimension", () => {
    const skillNames = ["workflow", "proof", "scaffolding", "documentation", "release", "security", "database"];
    const session = stubSession([], {
      toolCalls: skillNames.map((skill, index) => ({
        timestamp: index + 1,
        name: "command_execution",
        arguments: {
          command: `/bin/zsh -lc "sed -n '1,80p' /repo/agents/.agents/skills/${skill}/SKILL.md"`,
        },
        resultText: `# ${skill}`,
        wasBlocked: false,
      })),
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.scores).not.toHaveProperty("skill_focus");
    expect(result.findings.some((finding) => finding.startsWith("Loaded too many Consult skills"))).toBe(false);
  });

  it("does not cap change_quality on file count; rewards source+tests together", () => {
    const fileWrites = Array.from({ length: 12 }, (_, index) => ({
      timestamp: index + 1,
      path: index < 6 ? `src/module${index}.js` : `test/module${index - 6}.test.js`,
      tool: "edit" as const,
      labels: index < 6 ? ["source" as const] : ["test" as const],
    }));
    const session = stubSession([], { fileWrites });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.scores["change_quality"]).toBe(100);
    expect(result.findings).not.toContain("The solution touched many files for a small trial.");
  });

  it("scores change_quality lower when source is written without tests", () => {
    const session = stubSession([], {
      fileWrites: [{ timestamp: 10, path: "src/cart.js", tool: "edit", labels: ["source"] }],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.scores["change_quality"]).toBe(70);
  });

  it("counts assistant messages that end by asking the user a question", () => {
    const rawLines = [
      messageLine("user", "Fix the bug."),
      messageLine("assistant", "Before I implement, should I use expand-contract for this migration?"),
      messageLine("assistant", "Done. The fix is in src/cart.js and the regression test passes."),
      messageLine("assistant", "Proposed contract:\n- totalCents(items, coupon)\n\nApprove this shape?"),
    ];

    expect(countQuestionMessages(rawLines)).toBe(2);
    expect(countQuestionMessages([messageLine("assistant", "All done.")])).toBe(0);
  });

  it("records skill trigger rate and interruption count as zero-weight readouts", () => {
    const session = stubSession([], {
      fileWrites: [{ timestamp: 10, path: "src/cart.js", tool: "edit", labels: ["source"] }],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: {
        submittedProofPassed: 1,
        intendedSkillCount: 4,
        intendedSkillReads: 2,
        skillTriggerRate: 50,
        questionMessages: 1,
      },
    });

    expect(result.scores["skill_triggering"]).toBe(50);
    expect(result.weights["skill_triggering"]).toBe(0);
    expect(result.scores["non_interruption"]).toBe(75);
    expect(result.weights["non_interruption"]).toBe(0);
    expect(result.findings).toContain("Read 2 of 4 intended skills; see .has-eval/consult-metrics.json for names.");
    expect(result.findings).toContain("1 assistant message ended by asking the user a question.");

    const weightSum = Object.values(result.weights).reduce((sum, weight) => sum + weight, 0);
    expect(Math.abs(weightSum - 1)).toBeLessThan(1e-9);
  });

  it("omits the readout scores when consult metrics are absent (bare baseline reports)", () => {
    const session = stubSession([]);

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    expect(result.scores).not.toHaveProperty("skill_triggering");
    expect(result.scores).not.toHaveProperty("non_interruption");
  });

  it("bridges intended-skill and question metrics from afterRun to verify", async () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "has-eval-metrics-"));
    try {
      fs.writeFileSync(path.join(workDir, ".has-eval-kind.json"), JSON.stringify({ kind: "routing", case: 1 }));
      const session = stubSession(
        [messageLine("assistant", "Which store should own this data?")],
        {
          toolCalls: [
            {
              timestamp: 1,
              name: "command_execution",
              arguments: { command: "cat .codex/skills/workflow/SKILL.md" },
              resultText: "# Workflow",
              wasBlocked: false,
            },
          ],
        },
      );

      await maturityPlugin.afterRun?.({
        evalDir,
        runDir: workDir,
        workDir,
        trialName: "routing-test",
        variantName: "default",
        manifest: { description: "test", features: ["workflow", "database"], variants: { default: {} } },
        variant: {},
        session,
      });

      const verify = maturityPlugin.verify?.(workDir);
      expect(verify?.metrics["intendedSkillCount"]).toBe(2);
      expect(verify?.metrics["intendedSkillReads"]).toBe(1);
      expect(verify?.metrics["skillTriggerRate"]).toBe(50);
      expect(verify?.metrics["questionMessages"]).toBe(1);

      const stored = JSON.parse(fs.readFileSync(path.join(workDir, ".has-eval", "consult-metrics.json"), "utf-8")) as {
        missingSkills: string[];
        readSkills: string[];
      };
      expect(stored.readSkills).toEqual(["workflow"]);
      expect(stored.missingSkills).toEqual(["database"]);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  it("keeps deterministic weights summing to 1 and dominated by outcome metrics", () => {
    const session = stubSession([], {
      fileWrites: [{ timestamp: 10, path: "src/cart.js", tool: "edit", labels: ["source"] }],
    });

    const result = maturityPlugin.scoreSession(session, {
      passed: true,
      output: "ok",
      metrics: { submittedProofPassed: 1 },
    });

    const weightSum = Object.values(result.weights).reduce((sum, weight) => sum + weight, 0);
    expect(Math.abs(weightSum - 1)).toBeLessThan(1e-9);
    const outcomeWeight = (result.weights["verification"] ?? 0) + (result.weights["proof"] ?? 0);
    expect(outcomeWeight).toBeGreaterThanOrEqual(0.7);
  });
});
