// Coordinates branch-aware proof phases and serialized test runs for Pi.
import * as fs from "node:fs";
import * as path from "node:path";
import type { TextContent } from "@earendil-works/pi-ai";
import type { ExtensionContext, ToolResultEvent } from "@earendil-works/pi-coding-agent";

import { isConfigFile, isProductionFile, isTestFile } from "./file-classification.js";
import { formatDuration, type TestSummary } from "./parsers.js";
import { buildSystemPrompt, type Phase } from "./prompt.js";
import { evaluateTestResult, getStringInput } from "./proof-state.js";
import { renderWidget } from "./proof-widget.js";
import { detectsShellWritePattern, extractRedirectTargets } from "./shell-detection.js";
import { resolveTestConfig as defaultResolveTestConfig, type TestConfig } from "./test-config.js";
import {
  appendTestRunOutput,
  runTestCommand as defaultRunTestCommand,
  TEST_RUN_FAIL_DISMISS_MS,
  TEST_RUN_MIN_VISIBLE_MS,
  TEST_RUN_PASS_DISMISS_MS,
  TEST_RUN_SPINNER_FRAMES,
  type TestRunSnapshot,
} from "./test-run-overlay.js";

export const PROOF_STATE_ENTRY = "consult-proof-state";

interface ToolCallMutation {
  block?: boolean;
  reason?: string;
}

interface ToolResultMutation {
  content?: ToolResultEvent["content"];
  details?: unknown;
}

export interface ProofSnapshot {
  phase: Phase;
  testCommand?: string;
  testCwd?: string;
  mutationGeneration: number;
  greenGeneration: number;
  testEvidenceObserved: boolean;
  focusCommand?: string;
  greenCommand?: string;
}

interface ProofDependencies {
  runTestCommand?: typeof defaultRunTestCommand;
  resolveTestConfig?: typeof defaultResolveTestConfig;
  readTestScript?: (cwd: string | undefined) => string | undefined;
  persist?: (snapshot: ProofSnapshot) => void;
}

/** Read the package.json `test` script from the test directory, if any. */
export function readPackageTestScript(cwd: string | undefined): string | undefined {
  if (!cwd) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")) as { scripts?: Record<string, unknown> };
    const script = parsed.scripts?.test;
    return typeof script === "string" ? script : undefined;
  } catch {
    return undefined;
  }
}

const SHELL_DECORATION_RE = /\s*(?:\d?>>?|\||;|&&|\|\|)/;

/**
 * A manual run counts as full-suite evidence only when the configured command
 * appears with no extra arguments before any pipe, redirect, or chained command.
 */
export function isFullSuiteCommand(command: string | undefined, configuredCommand: string | undefined): boolean {
  if (!command || !configuredCommand) return false;
  const index = command.indexOf(configuredCommand);
  if (index === -1) return false;
  const remainder = command.slice(index + configuredCommand.length);
  const extraArgs = remainder.split(SHELL_DECORATION_RE)[0] ?? "";
  return extraArgs.trim() === "";
}

function appendTextContent(content: ToolResultEvent["content"], text: string): ToolResultMutation {
  return { content: [...content, { type: "text", text }] };
}

function joinTextContent(content: ToolResultEvent["content"]): string {
  return content
    .filter((item): item is TextContent => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

function isProofSnapshot(value: unknown): value is ProofSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ProofSnapshot>;
  return (
    ["off", "specifying", "implementing", "refactoring"].includes(String(snapshot.phase)) &&
    typeof snapshot.mutationGeneration === "number" &&
    typeof snapshot.greenGeneration === "number" &&
    typeof snapshot.testEvidenceObserved === "boolean"
  );
}

/** Create one proof controller for the current Pi extension runtime. */
export function createProofController(dependencies: ProofDependencies = {}) {
  const runTestCommand = dependencies.runTestCommand ?? defaultRunTestCommand;
  const resolveTestConfig = dependencies.resolveTestConfig ?? defaultResolveTestConfig;
  const readTestScript = dependencies.readTestScript ?? readPackageTestScript;
  let activeTestRun: TestRunSnapshot | undefined;
  let activeTestRunShownAt = 0;
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;
  let spinnerTimer: ReturnType<typeof setInterval> | undefined;
  let cycleCount = 0;
  let lastSummary: TestSummary | undefined;
  let lastWidgetCtx: ExtensionContext | undefined;
  let pendingTestRun = false;
  let stubAllowed = false;
  let lastExecutedCommand: string | undefined;
  let snapshot: ProofSnapshot = {
    phase: "off",
    mutationGeneration: 0,
    greenGeneration: -1,
    testEvidenceObserved: false,
  };

  const persist = () => dependencies.persist?.({ ...snapshot });

  function stopTimers() {
    if (dismissTimer) clearTimeout(dismissTimer);
    if (spinnerTimer) clearInterval(spinnerTimer);
    dismissTimer = undefined;
    spinnerTimer = undefined;
  }

  function updateWidget(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;
    lastWidgetCtx = ctx;
    if (snapshot.phase === "off") {
      ctx.ui.setWidget("proof", undefined);
      return;
    }
    ctx.ui.setWidget("proof", (_tui, theme) => ({
      invalidate() {},
      render: (width: number) =>
        renderWidget({ activeTestRun, cycleCount, phase: snapshot.phase, summary: lastSummary }, theme, width),
    }));
  }

  function setPhase(phase: Phase, ctx: ExtensionContext) {
    snapshot = { ...snapshot, phase };
    if (ctx.hasUI) ctx.ui.setStatus("proof", phase === "off" ? undefined : `PROOF: ${phase.toUpperCase()}`);
    updateWidget(ctx);
    persist();
  }

  function beginTestRun(ctx: ExtensionContext, command = snapshot.testCommand ?? "") {
    lastExecutedCommand = command;
    const cwdLabel = snapshot.testCwd && snapshot.testCwd !== ctx.cwd ? path.basename(snapshot.testCwd) : undefined;
    stopTimers();
    activeTestRunShownAt = Date.now();
    activeTestRun = { command, cwdLabel, outputLines: [], running: true, spinnerFrame: TEST_RUN_SPINNER_FRAMES[0] };
    if (ctx.hasUI) {
      spinnerTimer = setInterval(() => {
        if (!activeTestRun?.running || !lastWidgetCtx) return;
        const index = TEST_RUN_SPINNER_FRAMES.indexOf(activeTestRun.spinnerFrame);
        activeTestRun = { ...activeTestRun, spinnerFrame: TEST_RUN_SPINNER_FRAMES[(index + 1) % TEST_RUN_SPINNER_FRAMES.length] };
        updateWidget(lastWidgetCtx);
      }, 80);
    }
    updateWidget(ctx);
  }

  function finishTestRun(passed: boolean, durationMs: number, ctx: ExtensionContext) {
    if (spinnerTimer) clearInterval(spinnerTimer);
    spinnerTimer = undefined;
    if (!activeTestRun) return;
    activeTestRun = { ...activeTestRun, duration: formatDuration(durationMs), passed, running: false };
    updateWidget(ctx);
    const minimum = Math.max(0, TEST_RUN_MIN_VISIBLE_MS - (Date.now() - activeTestRunShownAt));
    const dismiss = passed ? TEST_RUN_PASS_DISMISS_MS : TEST_RUN_FAIL_DISMISS_MS;
    dismissTimer = setTimeout(() => {
      activeTestRun = undefined;
      if (lastWidgetCtx) updateWidget(lastWidgetCtx);
    }, minimum + dismiss);
  }

  function applyTestResult(result: ReturnType<typeof evaluateTestResult>, ctx: ExtensionContext) {
    lastSummary = result.summary;
    stubAllowed = result.stubAllowed;
    if (result.testEvidenceObserved) snapshot = { ...snapshot, testEvidenceObserved: true };
    if (result.focusCommand) snapshot = { ...snapshot, focusCommand: result.focusCommand };
    if (result.clearFocus) snapshot = { ...snapshot, focusCommand: undefined };
    if (result.nextPhase) setPhase(result.nextPhase, ctx);
    if (result.summary.failed === 0 && result.summary.passed > 0) {
      const greenCommand = lastExecutedCommand;
      snapshot = { ...snapshot, greenGeneration: snapshot.mutationGeneration, greenCommand };
      if (isFullSuiteCommand(greenCommand, snapshot.testCommand)) snapshot = { ...snapshot, focusCommand: undefined };
      persist();
    }
    updateWidget(ctx);
  }

  return {
    getPhase: () => snapshot.phase,
    getSnapshot: () => ({ ...snapshot }),

    restore(entries: unknown[], ctx: ExtensionContext) {
      for (const raw of entries) {
        const entry = (raw as { message?: unknown })?.message ?? raw;
        if ((entry as { type?: unknown })?.type !== "custom") continue;
        if ((entry as { customType?: unknown })?.customType !== PROOF_STATE_ENTRY) continue;
        const data = (entry as { data?: unknown }).data;
        if (isProofSnapshot(data)) snapshot = { ...data };
      }
      updateWidget(ctx);
    },

    async enable(ctx: ExtensionContext, requested?: Partial<TestConfig>): Promise<string> {
      if (snapshot.phase !== "off") return "Proof mode is already active";
      const config = requested?.command
        ? { command: requested.command, cwd: requested.cwd ?? ctx.cwd }
        : await resolveTestConfig(ctx.cwd, ctx.hasUI ? ctx.ui : undefined);
      if (!config) return "Could not determine test command. Pass one explicitly: /proof <command>.";

      cycleCount = 1;
      lastSummary = undefined;
      pendingTestRun = false;
      stubAllowed = false;
      snapshot = {
        phase: "specifying",
        testCommand: config.command,
        testCwd: config.cwd,
        mutationGeneration: 0,
        greenGeneration: -1,
        testEvidenceObserved: false,
      };
      setPhase("specifying", ctx);
      return `Proof enabled — SPECIFYING phase. Test command: ${config.command}`;
    },

    cancel(ctx: ExtensionContext): { ok: true; message: string } {
      stopTimers();
      pendingTestRun = false;
      snapshot = { phase: "off", mutationGeneration: 0, greenGeneration: -1, testEvidenceObserved: false };
      setPhase("off", ctx);
      return { ok: true, message: "Proof cancelled" };
    },

    complete(ctx: ExtensionContext): { ok: boolean; message: string } {
      const freshGreen = snapshot.greenGeneration === snapshot.mutationGeneration;
      if (snapshot.phase !== "refactoring" || !freshGreen) {
        return { ok: false, message: "proof_done requires fresh passing test evidence after the latest mutation" };
      }
      if (!isFullSuiteCommand(snapshot.greenCommand, snapshot.testCommand)) {
        return { ok: false, message: `proof_done requires fresh full suite evidence: ${snapshot.testCommand}` };
      }
      stopTimers();
      snapshot = { phase: "off", mutationGeneration: 0, greenGeneration: -1, testEvidenceObserved: false };
      setPhase("off", ctx);
      return { ok: true, message: "Proof completed" };
    },

    handleProductionWrite(filePath: string, _ctx: ExtensionContext): ToolCallMutation | undefined {
      if (snapshot.phase !== "specifying" || !isProductionFile(filePath) || stubAllowed) return undefined;
      return { block: true, reason: "Proof is specifying: write a failing behavior proof before production code" };
    },

    async handleFileToolResult(event: ToolResultEvent, _ctx: ExtensionContext): Promise<undefined> {
      if (snapshot.phase === "off" || event.isError) return undefined;
      if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
      const filePath = getStringInput(event.input, "path");
      if (!filePath || isConfigFile(filePath)) return undefined;

      if (isTestFile(filePath)) snapshot = { ...snapshot, testEvidenceObserved: true };
      if (snapshot.phase === "specifying" && !isTestFile(filePath)) return undefined;
      snapshot = { ...snapshot, mutationGeneration: snapshot.mutationGeneration + 1, greenGeneration: -1, greenCommand: undefined };
      pendingTestRun = true;
      persist();
      return undefined;
    },

    async flushPendingTests(ctx: ExtensionContext): Promise<string | undefined> {
      if (!pendingTestRun || !snapshot.testCommand) return undefined;
      if (snapshot.phase === "specifying" && !snapshot.testEvidenceObserved) return undefined;
      pendingTestRun = false;
      const command = snapshot.phase === "implementing" && snapshot.focusCommand ? snapshot.focusCommand : snapshot.testCommand;
      beginTestRun(ctx, command);
      const result = await runTestCommand(command, snapshot.testCwd, (chunk) => {
        if (!activeTestRun) return;
        activeTestRun = { ...activeTestRun, outputLines: appendTestRunOutput(activeTestRun.outputLines, chunk) };
        updateWidget(ctx);
      });
      finishTestRun(result.passed, result.durationMs, ctx);
      const evaluated = evaluateTestResult({
        ...result,
        command: snapshot.testCommand,
        phase: snapshot.phase,
        testScript: readTestScript(snapshot.testCwd),
      });
      applyTestResult(evaluated, ctx);
      return evaluated.appendText;
    },

    handleShellWriteWarning(event: ToolResultEvent): ToolResultMutation | undefined {
      if (snapshot.phase !== "specifying" || (event.toolName !== "bash" && event.toolName !== "powershell")) return undefined;
      const command = getStringInput(event.input, "command");
      if (!command || (snapshot.testCommand && command.includes(snapshot.testCommand))) return undefined;
      if (!detectsShellWritePattern(command) && event.toolName !== "powershell") return undefined;
      const targets = extractRedirectTargets(command);
      if (targets.length > 0 && !targets.some(isProductionFile)) return undefined;
      return appendTextContent(event.content, "\n\n[PROOF WARNING] Possible production write during SPECIFYING.");
    },

    handleManualTestRun(event: ToolResultEvent, ctx: ExtensionContext): ToolResultMutation | undefined {
      if (snapshot.phase === "off" || event.toolName !== "bash") return undefined;
      const command = getStringInput(event.input, "command");
      if (!command || !snapshot.testCommand || !command.includes(snapshot.testCommand)) return undefined;
      pendingTestRun = false;
      lastExecutedCommand = command;
      const evaluated = evaluateTestResult({
        command,
        output: joinTextContent(event.content),
        passed: !event.isError,
        phase: snapshot.phase,
        testScript: readTestScript(snapshot.testCwd),
      });
      applyTestResult(evaluated, ctx);
      return appendTextContent(event.content, evaluated.appendText);
    },

    buildSystemPrompt(basePrompt: string) {
      return buildSystemPrompt(basePrompt, snapshot.phase, snapshot.testCommand, snapshot.testCwd);
    },

    shutdown() {
      stopTimers();
      lastWidgetCtx = undefined;
    },
  };
}
