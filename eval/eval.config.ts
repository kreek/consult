import * as os from "node:os";
import * as path from "node:path";
import type { ProjectEvalConfig } from "do-eval";

const provider = process.env["CONSULT_EVAL_PROVIDER"] ?? "openai";
const model = process.env["CONSULT_EVAL_MODEL"] ?? "gpt-5.5";
const judgeModel = process.env["CONSULT_EVAL_JUDGE_MODEL"] ?? "gpt-5.5";
const reasoningEffort = process.env["CONSULT_EVAL_REASONING_EFFORT"] ?? "medium";
const codexReasoningArgs = ["-c", `model_reasoning_effort="${reasoningEffort}"`];
const epochs = Number(process.env["CONSULT_EVAL_EPOCHS"] ?? 1);

const CONSULT_REPO_ROOT = path.resolve(import.meta.dirname, "..");

// One bare codex agent. Consult is NOT configured here — it is applied through
// the profile's setup.layers (a codex plugin-install layer + a skill-library
// layer). do-eval's per-profile baseline strips those layers (`bareProfileOf`)
// while keeping this agent verbatim, so the auto-derived baseline is genuinely
// bare codex and `lift` measures exactly what Consult adds.
const codexAgent = {
  harness: "codex",
  provider,
  model,
  codex: {
    isolateHome: true,
    ignoreUserConfig: true,
    extraArgs: codexReasoningArgs,
  },
} as const;

const skillLayerCapabilities = [
  "accessibility",
  "api",
  "architecture",
  "async-systems",
  "code-review",
  "domain-modeling",
  "database",
  "debugging",
  "documentation",
  "error-handling",
  "git-workflow",
  "observability",
  "performance",
  "proof",
  "refactoring",
  "release",
  "scaffolding",
  "security",
  "ui-design",
  "specify",
  "workflow",
];

const config: ProjectEvalConfig = {
  profiles: {
    codexWithConsultSkills: {
      id: "codexWithConsultSkills",
      label: "Codex + Consult skills",
      agent: codexAgent,
      setup: {
        layers: [
          // Registers the Consult codex plugin marketplace and enables it.
          // do-eval injects `pluginMarketplaces: [source]` and
          // `-c plugins."consult@consult".enabled=true` from this layer (the
          // layer id is the codex plugin slug: consult@consult).
          {
            id: "consult",
            kind: "plugin",
            mode: "install",
            runtime: "codex",
            source: CONSULT_REPO_ROOT,
            capabilities: skillLayerCapabilities,
          },
          // Mirrors the canonical skill files into the workdir's .codex/skills.
          {
            id: "consult-skills",
            kind: "skill-library",
            runtime: "codex",
            source: "../agents/.agents/skills",
            capabilities: skillLayerCapabilities,
          },
        ],
      },
      factors: {
        harness: "codex",
        provider,
        model,
        reasoningEffort,
        layers: [
          {
            id: "consult",
            kind: "plugin",
            runtime: "codex",
            capabilities: skillLayerCapabilities,
          },
        ],
      },
    },
  },
  defaultProfile: "codexWithConsultSkills",
  defaultPlugin: "engineering-maturity",
  // Global epoch count. Per-suite repetition (formerly the 3-epoch core/routing
  // benches) is recovered at the script layer via CONSULT_EVAL_EPOCHS.
  epochs,
  runsDir: process.env["CONSULT_EVAL_RUNS_DIR"] ?? path.join(os.homedir(), ".cache", "consult", "eval", "runs"),
  judge: {
    provider: "openai-codex",
    model: judgeModel,
    thinking: reasoningEffort,
  },
  timeouts: {
    workerMs: 15 * 60 * 1000,
    inactivityMs: 2 * 60 * 1000,
    judgeMs: 2 * 60 * 1000,
  },
  budgets: {
    maxDurationMs: 15 * 60 * 1000,
    maxToolCalls: 200,
    maxBlockedCalls: 0,
  },
  defaultLaunchType: "suite",
};

export default config;
