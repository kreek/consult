import * as fs from "node:fs";
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
// layer), so a baseline profile that declares no layers while reusing this agent
// verbatim is genuinely bare codex.
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

// Derived from the shipped plugin rather than hand-listed: a hardcoded copy had
// silently drifted to 21 names while the pack ships 24.
const skillLayerCapabilities = fs
  .readdirSync(path.join(CONSULT_REPO_ROOT, "plugin", "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

// A real Claude Code process, authenticated by the user's existing subscription
// login. Auth comes from the OS keychain, so no ANTHROPIC_API_KEY is involved and
// the run does not bill the API; the harness asserts this by unsetting the key and
// recording the init event's apiKeySource. As with codex, Consult is NOT
// configured here, only through setup.layers.
const claudeAgent = {
  harness: "claude",
  provider: "anthropic",
  model: process.env["CONSULT_EVAL_CLAUDE_MODEL"] ?? "claude-sonnet-5",
  thinking: reasoningEffort,
  claude: {
    // Load no user/project settings. Without this the user's globally enabled
    // consult@consult plugin would leak into the bare arm and lift would read zero.
    settingSources: "",
    // stdin is closed for eval workers, so a prompting mode cannot be answered.
    permissionMode: "bypassPermissions",
    strictMcp: true,
    maxBudgetUsd: Number(process.env["CONSULT_EVAL_CLAUDE_BUDGET_USD"] ?? 2),
  },
} as const;

const claudeFactors = {
  harness: "claude",
  provider: claudeAgent.provider,
  model: claudeAgent.model,
  reasoningEffort,
};

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

    // The two Claude Code arms. They share `claudeAgent` by reference and differ
    // only by the presence of the plugin layer, so the delta between them isolates
    // Consult rather than any difference in how the worker was launched.
    claudeWithConsultPlugin: {
      id: "claudeWithConsultPlugin",
      label: "Claude Code + Consult plugin",
      agent: claudeAgent,
      setup: {
        layers: [
          // Loaded with --plugin-dir, which is session-scoped: no marketplace
          // install, nothing mutated outside the run, nothing to clean up.
          // Verified to surface every skill as consult:<name>.
          {
            id: "consult",
            kind: "plugin",
            mode: "session-flag",
            runtime: "claude",
            source: path.join(CONSULT_REPO_ROOT, "plugin"),
            capabilities: skillLayerCapabilities,
          },
        ],
      },
      factors: {
        ...claudeFactors,
        layers: [
          {
            id: "consult",
            kind: "plugin",
            runtime: "claude",
            capabilities: skillLayerCapabilities,
          },
        ],
      },
    },

    // Stock Claude Code. It keeps the bundled Anthropic skills, because that is
    // what a user without Consult actually has; the comparison is therefore
    // "Consult on top of stock", not "skills versus no skills".
    claudeBare: {
      id: "claudeBare",
      label: "Claude Code (bare)",
      agent: claudeAgent,
      setup: { layers: [] },
      factors: { ...claudeFactors, layers: [] },
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
