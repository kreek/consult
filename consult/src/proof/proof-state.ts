import { isConfigFile, isTestFile } from "./file-classification.js";
import { formatDuration, parseTestOutput, type TestSummary } from "./parsers.js";
import type { Phase } from "./prompt.js";

const IMPORT_ERROR_PATTERNS = [
  "Cannot find module",
  "Module not found",
  "ModuleNotFoundError",
  "ImportError",
  "unresolved import",
  "cannot find package",
  "no required module",
  "Could not resolve",
];

const IMPORT_ERROR_RE = new RegExp(IMPORT_ERROR_PATTERNS.join("|"), "i");

export interface EvaluatedTestResult {
  appendText: string;
  /** Drop the focused command so the next automatic run widens to the configured command. */
  clearFocus: boolean;
  focusCommand?: string;
  nextPhase: Phase | undefined;
  stubAllowed: boolean;
  summary: TestSummary;
  testEvidenceObserved: boolean;
}

function isImportOnlyFailure(output: string, summary: TestSummary): boolean {
  const noTestsRan = summary.passed === 0 && summary.failed === 0 && summary.tests.length === 0;
  return noTestsRan && IMPORT_ERROR_RE.test(output);
}

function tokenizeCommand(command: string): string[] {
  return command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((token) => token.replace(/^(["'])(.*)\1$/, "$2")) ?? [];
}

function shellQuote(value: string, platform: NodeJS.Platform): string {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  if (platform === "win32") return `"${value.replaceAll('"', '\\"')}"`;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const JS_RUNNERS = ["vitest", "jest"];
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];

function isBareRunnerScript(script: string | undefined): boolean {
  if (!script) return false;
  if (/&&|\|\||;|\|/.test(script)) return false;
  const tokens = tokenizeCommand(script);
  if (["npx", "bunx"].includes(tokens[0] ?? "")) tokens.shift();
  return JS_RUNNERS.includes(tokens[0] ?? "");
}

function invokesTestScript(tokens: string[]): boolean {
  return tokens.some((token, index) => token === "test" || (token === "run" && tokens[index + 1] === "test"));
}

/**
 * Classify how focus arguments must be appended, or undefined when the command
 * is not a recognised Vitest/Jest invocation. Package-manager `test` scripts
 * only qualify when the resolved script is a bare runner call, because pnpm
 * and friends append extra arguments to the end of compound scripts.
 */
function testRunnerKind(command: string, testScript: string | undefined): "npm" | "js" | undefined {
  const tokens = tokenizeCommand(command);
  if (!tokens.length) return undefined;
  if (JS_RUNNERS.includes(tokens[0])) return "js";
  if (["npx", "bunx"].includes(tokens[0]) && JS_RUNNERS.includes(tokens[1] ?? "")) return "js";
  if (!PACKAGE_MANAGERS.includes(tokens[0])) return undefined;

  const rest = tokens.slice(1).filter((token) => !token.startsWith("-"));
  if (rest[0] === "exec" || rest[0] === "dlx") rest.shift();
  if (JS_RUNNERS.includes(rest[0] ?? "")) return "js";
  if (!invokesTestScript(tokens) || !isBareRunnerScript(testScript)) return undefined;
  return tokens[0] === "npm" ? "npm" : "js";
}

function commandWithRunnerSeparator(command: string, args: string, testScript: string | undefined): string | undefined {
  const kind = testRunnerKind(command, testScript);
  if (!kind) return undefined;
  return kind === "npm" ? `${command} -- ${args}` : `${command} ${args}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function stripTrailingDuration(name: string): string {
  return name.replace(/\s+\d+(?:\.\d+)?\s*m?s$/i, "");
}

function failedTestPath(name: string): string | undefined {
  const filePath = stripTrailingDuration(name.split(" > ")[0]?.trim() ?? "");
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath) ? filePath : undefined;
}

function vitestOrJestFocusArgs(names: string[], platform: NodeJS.Platform): string | undefined {
  const filePaths = names.map(failedTestPath);
  if (filePaths.some((filePath) => !filePath)) return undefined;

  const uniquePaths = [...new Set(filePaths as string[])];
  if (names.length > 1) return uniquePaths.map((filePath) => shellQuote(filePath, platform)).join(" ");

  const parts = names[0].split(" > ").map((part) => stripTrailingDuration(part.trim())).filter(Boolean);
  const testName = parts.at(-1);
  return testName && testName !== uniquePaths[0]
    ? `${shellQuote(uniquePaths[0], platform)} -t ${shellQuote(escapeRegex(testName), platform)}`
    : shellQuote(uniquePaths[0], platform);
}

export interface FocusOptions {
  platform?: NodeJS.Platform;
  /** The package.json `test` script behind a package-manager `test` command, when known. */
  testScript?: string;
}

export function focusedCommandForFailures(command: string, summary: TestSummary, options: FocusOptions = {}): string | undefined {
  if (!command.trim()) return undefined;

  const failedNames = summary.tests.filter((test) => !test.passed).map((test) => test.name);
  if (failedNames.length === 0) return undefined;

  const args = vitestOrJestFocusArgs(failedNames, options.platform ?? process.platform);
  return args ? commandWithRunnerSeparator(command, args, options.testScript) : undefined;
}

export function getStringInput(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" ? value : undefined;
}

export function shouldRunTests(phase: Phase, filePath: string): boolean {
  if (isConfigFile(filePath)) return false;

  switch (phase) {
    case "specifying":
      return isTestFile(filePath);
    case "implementing":
    case "refactoring":
      return true;
    default:
      return false;
  }
}

export function evaluateTestResult(params: {
  command?: string;
  durationMs?: number;
  output: string;
  passed: boolean;
  phase: Phase;
  testScript?: string;
}): EvaluatedTestResult {
  const { durationMs, output, passed, phase } = params;
  const summary = parseTestOutput(output);

  if (durationMs != null && !summary.duration) {
    summary.duration = formatDuration(durationMs);
  }

  const testEvidenceObserved = phase === "specifying" && !passed && summary.failed > 0;
  const label = `[PROOF ${phase.toUpperCase()}] Tests ${passed ? "PASS" : "FAIL"}`;
  let appendText = `\n${label}:\n${output}`;
  let clearFocus = false;
  let focusCommand: string | undefined;
  let nextPhase: Phase | undefined;
  let stubAllowed = false;

  if (phase === "specifying" && !passed && isImportOnlyFailure(output, summary)) {
    stubAllowed = true;
    appendText +=
      "\n\n[PROOF HINT] Tests failed due to a missing module, not a failing assertion." +
      " You may now create a minimal stub (empty class/function with the right exports)" +
      " so the tests can load and fail on actual behavioral assertions. Stay in SPECIFYING" +
      " — do not implement business logic yet. The stub allowance will clear after the next test run.";
  } else if (phase === "specifying" && !passed) {
    focusCommand = focusedCommandForFailures(params.command ?? "", summary, { testScript: params.testScript });
    nextPhase = "implementing";
  } else if (phase === "implementing" && passed && summary.passed > 0) {
    nextPhase = "refactoring";
  } else if (phase === "implementing" && passed && summary.passed === 0) {
    clearFocus = true;
    appendText +=
      "\n\n[PROOF WARNING] The command exited successfully but no passing tests were observed." +
      " Stay in IMPLEMENTING; the next automatic run uses the configured test command." +
      " Run a command that executes the known failing proof.";
  }

  return { appendText, clearFocus, focusCommand, nextPhase, stubAllowed, summary, testEvidenceObserved };
}
