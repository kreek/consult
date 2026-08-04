#!/usr/bin/env node
// Smoke-test a Consult skill change against a real Claude Code process.
//
// Two tiers, cheapest first:
//   1. Load check. Launches Claude Code with the plugin and reads the init event,
//      which the host emits before any inference, so this costs nothing. It is the
//      only check that proves the *host* accepts a skill; validate-skill-anatomy
//      checks our own schema and cannot see a skill the host silently drops.
//   2. Behavioural trial. Runs one do-eval trial covering the changed skills and
//      asserts the pack activated. Costs one short Claude Code session.
//
// Auth comes from the existing Claude Code login, so no ANTHROPIC_API_KEY is used
// and the run does not bill the API.

import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_DIR = join(REPO_ROOT, "plugin");
const SKILLS_DIR = join(PLUGIN_DIR, "skills");
const EVAL_DIR = join(REPO_ROOT, "eval");
const TRIALS_DIR = join(EVAL_DIR, "trials");
// The eval harness lives in an unpublished sibling checkout, same assumption as
// `make eval`.
const DO_EVAL_DIR = resolve(REPO_ROOT, "..", "do-eval");
const MODEL = process.env["CONSULT_EVAL_CLAUDE_MODEL"] ?? "claude-sonnet-5";
const SKILL_PATH_RE = /(?:agents\/\.agents|plugin|consult)\/skills\/([^/]+)\//;

export function shippedSkills() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Canonical skills and both generated mirrors all count: an edit to any of them is
// a skill change worth smoke-testing.
export function skillsFromPaths(paths) {
  const skills = new Set();
  for (const filePath of paths) {
    const match = SKILL_PATH_RE.exec(filePath);
    if (match?.[1]) skills.add(match[1]);
  }
  return [...skills].sort();
}

function git(args) {
  return runCaptured("git", args, { cwd: REPO_ROOT });
}

// Uncommitted edits plus anything committed on this branch since it left main.
async function changedSkills() {
  const paths = new Set();
  for (const args of [["diff", "--name-only", "HEAD"], ["diff", "--name-only", "--cached"]]) {
    const result = await git(args);
    if (result.status === 0) for (const line of result.stdout.split("\n")) if (line) paths.add(line);
  }
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch.status === 0 && branch.stdout.trim() !== "main") {
    const committed = await git(["diff", "--name-only", "main...HEAD"]);
    if (committed.status === 0) for (const line of committed.stdout.split("\n")) if (line) paths.add(line);
  }

  return skillsFromPaths(paths);
}

export function trialFeatures(trial) {
  const manifest = join(TRIALS_DIR, trial, "trial.yaml");
  if (!existsSync(manifest)) return [];
  const block = /features:\s*\n((?:\s*-\s*\S+\n)+)/.exec(readFileSync(manifest, "utf-8"));
  if (!block?.[1]) return [];
  return [...block[1].matchAll(/-\s*(\S+)/g)].map((match) => match[1]);
}

function listTrials() {
  return readdirSync(TRIALS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Prefer routing trials: they are read-only and finish in well under a minute,
// which is the right cost for a smoke test. Among equals, prefer the trial that
// covers the most changed skills.
export function pickTrial(changed) {
  const scored = listTrials()
    .map((trial) => {
      const features = trialFeatures(trial);
      return {
        trial,
        covered: changed.filter((skill) => features.includes(skill)).length,
        routing: existsSync(join(TRIALS_DIR, trial, "scaffold", ".has-eval-kind.json")),
      };
    })
    .filter((entry) => entry.covered > 0);
  if (scored.length === 0) return undefined;
  scored.sort(
    (a, b) => Number(b.routing) - Number(a.routing) || b.covered - a.covered || a.trial.localeCompare(b.trial),
  );
  return scored[0];
}

function runCaptured(command, args, options = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => resolvePromise({ status: null, stdout, stderr: String(error) }));
    child.on("close", (status) => resolvePromise({ status, stdout, stderr }));
  });
}

function runStreaming(command, args, options = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.on("error", (error) => resolvePromise({ status: null, stdout, error }));
    child.on("close", (status) => resolvePromise({ status, stdout }));
  });
}

// Mirrors the do-eval claude harness. `--setting-sources ""` keeps the caller's
// own settings out, so this measures the plugin rather than the local install.
// The `--` is required: --disallowedTools is variadic and would eat the prompt.
function claudeArgs({ withPlugin }) {
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--no-session-persistence",
    "--permission-mode",
    "bypassPermissions",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--model",
    MODEL,
    "--tools",
    "",
  ];
  if (withPlugin) args.push("--plugin-dir", PLUGIN_DIR);
  args.push("--", "ok");
  return args;
}

const SCRUBBED_ENV = {
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_AUTH_TOKEN: undefined,
  CLAUDE_CODE_OAUTH_TOKEN: undefined,
  CLAUDECODE: undefined,
  CLAUDE_CODE_SESSION_ID: undefined,
  CLAUDE_CODE_ENABLE_ASK_USER_QUESTION_TOOL: undefined,
  CLAUDE_EFFORT: undefined,
  DISABLE_AUTOUPDATER: "1",
  DISABLE_TELEMETRY: "1",
};

// Reads the init event and kills the process before inference starts, so the
// check is effectively free.
function readInitEvent(withPlugin) {
  return new Promise((resolvePromise) => {
    const child = spawn("claude", claudeArgs({ withPlugin }), {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...SCRUBBED_ENV },
    });
    let buffer = "";
    let settled = false;
    let stderr = "";
    const finish = (value) => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolvePromise(value);
    };
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      try {
        finish({ event: JSON.parse(buffer.slice(0, newline)) });
      } catch (error) {
        finish({ error: `first stdout line was not JSON: ${String(error)}` });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => finish({ error: String(error) }));
    child.on("close", () => finish({ error: `claude exited before emitting an init event. ${stderr.trim()}` }));
  });
}

async function runLoadCheck(expected) {
  process.stdout.write("Load check: launching Claude Code with the plugin\n");
  const { event, error } = await readInitEvent(true);
  if (error) {
    console.error(`  FAIL ${error}`);
    return false;
  }
  if (event.type !== "system" || event.subtype !== "init") {
    console.error(`  FAIL expected a system/init event first, got ${event.type}/${event.subtype}`);
    return false;
  }

  const problems = [];
  if (event.apiKeySource !== "none") {
    // Not a skill problem, but it means the numbers came from somewhere else.
    problems.push(`apiKeySource is "${event.apiKeySource}", expected "none" (subscription auth)`);
  }
  const plugin = (event.plugins ?? []).find((entry) => entry.name === "consult");
  if (!plugin) problems.push("the consult plugin did not load");

  const registered = new Set(
    (event.skills ?? []).filter((name) => name.startsWith("consult:")).map((name) => name.slice("consult:".length)),
  );
  const missing = expected.filter((skill) => !registered.has(skill));
  if (missing.length > 0) {
    problems.push(`the host did not register ${missing.length} shipped skill(s): ${missing.join(", ")}`);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  FAIL ${problem}`);
    return false;
  }
  console.log(`  PASS plugin ${plugin.version}, ${registered.size} skills registered, subscription auth`);
  return true;
}

async function runTrial(trial) {
  if (!existsSync(DO_EVAL_DIR) || !statSync(DO_EVAL_DIR).isDirectory()) {
    console.error(`  FAIL the do-eval sibling checkout is missing at ${DO_EVAL_DIR}`);
    return false;
  }
  // Run from the do-eval checkout: its CLI resolves $lib through its own tsconfig
  // and cannot start from this repo.
  console.log(`\nBehavioural trial: ${trial} (one Claude Code session)`);
  const result = await runStreaming(
    "bun",
    ["cli/index.ts", "trial", trial, "--profile", "claudeWithConsultPlugin", "--no-judge", "--project", EVAL_DIR],
    { cwd: DO_EVAL_DIR, env: { ...process.env } },
  );
  if (result.status !== 0) {
    console.error(`  FAIL do-eval exited ${result.status}`);
    return false;
  }

  const workDir = /Work dir:\s*(\S+)/.exec(result.stdout)?.[1];
  if (!workDir) {
    console.error("  FAIL could not find the run directory in do-eval output");
    return false;
  }
  const reportPath = join(dirname(workDir), "report.json");
  if (!existsSync(reportPath)) {
    console.error(`  FAIL no report at ${reportPath}`);
    return false;
  }

  const report = JSON.parse(readFileSync(reportPath, "utf-8"));
  const session = report.session ?? {};
  const problems = [];
  if (session.parseWarnings !== 0) problems.push(`${session.parseWarnings} unparseable transcript line(s)`);
  if (session.exitCode !== 0) problems.push(`worker exited ${session.exitCode}`);
  const init = (session.pluginEvents ?? []).find((event) => event.type === "claude_init");
  if (init?.data?.apiKeySource !== "none") problems.push("the run did not use subscription auth");
  const activation = (report.findings ?? []).find((finding) => finding.startsWith("Activated"));
  if (!activation) problems.push("no Consult skill activated");

  if (problems.length > 0) {
    for (const problem of problems) console.error(`  FAIL ${problem}`);
    return false;
  }
  console.log(`  PASS ${activation}`);
  return true;
}

function usage() {
  console.log(`Usage: node scripts/claude-smoke.mjs [options]

Smoke-test a Consult skill change against a real Claude Code process.

  --skill=<a,b>   Skills to test. Defaults to those changed vs main.
  --trial=<name>  Force a specific eval trial.
  --load-only     Run only the free load check, no Claude Code session.
  --all           Treat every shipped skill as changed.

Uses the existing Claude Code login, so no ANTHROPIC_API_KEY is involved.`);
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("-h") || argv.includes("--help")) {
    usage();
    return 0;
  }

  const shipped = shippedSkills();
  const explicit = argv.find((arg) => arg.startsWith("--skill="))?.slice("--skill=".length);
  const forcedTrial = argv.find((arg) => arg.startsWith("--trial="))?.slice("--trial=".length);

  let changed;
  if (argv.includes("--all")) changed = shipped;
  else if (explicit) changed = explicit.split(",").map((value) => value.trim()).filter(Boolean);
  else changed = await changedSkills();

  const unknown = changed.filter((skill) => !shipped.includes(skill));
  if (unknown.length > 0) {
    console.error(`unknown skill(s): ${unknown.join(", ")}`);
    return 2;
  }

  if (changed.length === 0) {
    console.log("No skill changes detected. Load check only; pass --skill=<name> to force a trial.");
  } else {
    console.log(`Changed skills: ${changed.join(", ")}`);
  }

  // The load check always covers the whole pack: one skill's frontmatter can stop
  // the host registering others.
  if (!(await runLoadCheck(shipped))) return 1;
  if (argv.includes("--load-only") || changed.length === 0) return 0;

  const picked = forcedTrial ? { trial: forcedTrial, covered: 0, routing: false } : pickTrial(changed);
  if (!picked) {
    console.log(`\nNo trial declares any of: ${changed.join(", ")}. Skipping the behavioural tier.`);
    console.log("Add the skill to a trial's features: list in eval/trials/<name>/trial.yaml to cover it.");
    return 0;
  }
  return (await runTrial(picked.trial)) ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
