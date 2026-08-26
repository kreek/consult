// Spawns an isolated, read-only Pi process to review the implementing agent's changes.
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const REVIEW_TOOLS = "read,grep,find,ls";
const MAX_DIFF_BYTES = 100 * 1024;

export interface ReviewRequest {
  cwd: string;
  model?: string;
  thinkingLevel?: string;
  changedPaths: string[];
  intent: string;
  signal?: AbortSignal;
}

export interface ReviewResult {
  output: string;
}

interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
  const currentScript = process.argv[1];
  const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
  if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
    return { command: process.execPath, args: [currentScript, ...args] };
  }

  const executable = path.basename(process.execPath).toLowerCase();
  if (!/^(node|bun)(\.exe)?$/.test(executable)) {
    return { command: process.execPath, args };
  }

  return { command: "pi", args };
}

async function runProcess(command: string, args: string[], cwd: string, signal?: AbortSignal): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let aborted = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (aborted) reject(new Error("Independent review was aborted"));
      else resolve({ code: code ?? 1, stdout, stderr });
    });

    const abort = () => {
      aborted = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5_000).unref();
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

async function readDiff(cwd: string, changedPaths: string[], signal?: AbortSignal): Promise<string> {
  const pathArgs = changedPaths.filter((item) => item && !item.startsWith("<"));
  const args = ["diff", "--no-ext-diff", "--unified=40", "HEAD"];
  if (pathArgs.length > 0) args.push("--", ...pathArgs);

  try {
    const result = await runProcess("git", args, cwd, signal);
    return Buffer.from(result.stdout).subarray(0, MAX_DIFF_BYTES).toString("utf8");
  } catch {
    return "";
  }
}

/** Extract the final assistant text from Pi's JSON event stream. */
export function finalAssistantText(jsonLines: string): string {
  let output = "";
  for (const line of jsonLines.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type !== "message_end" || event.message?.role !== "assistant") continue;
      for (const part of event.message.content ?? []) {
        if (part.type === "text") output = part.text;
      }
    } catch {
      // Ignore non-protocol output; stderr is reported separately on failure.
    }
  }
  return output.trim();
}

function reviewPrompt(request: ReviewRequest, diff: string): string {
  const paths = request.changedPaths.length > 0 ? request.changedPaths.map((item) => `- ${item}`).join("\n") : "- unknown";
  return [
    "/skill:code-review",
    "You are an independent reviewer in a fresh process. You did not implement this change.",
    "Review only; do not modify files. Report findings first in severity order with file:line anchors.",
    `Original intent: ${request.intent || "Not recorded"}`,
    `Changed paths:\n${paths}`,
    diff ? `Git diff supplied by the parent process:\n\n${diff}` : "No Git diff was available. Read the changed paths directly.",
  ].join("\n\n");
}

interface ReviewerArguments {
  model?: string;
  thinkingLevel?: string;
  skillPath: string;
  prompt: string;
}

/** Build CLI arguments that isolate the reviewer and restrict it to read-only tools. */
export function buildReviewerArgs(options: ReviewerArguments): string[] {
  const args = [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--skill",
    options.skillPath,
    "--tools",
    REVIEW_TOOLS,
  ];
  if (options.model) args.push("--model", options.model);
  if (options.thinkingLevel) args.push("--thinking", options.thinkingLevel);
  args.push(options.prompt);
  return args;
}

/** Run an independent review in a fresh, sessionless Pi process with read-only tools. */
export async function runIndependentReview(request: ReviewRequest): Promise<ReviewResult> {
  const diff = await readDiff(request.cwd, request.changedPaths, request.signal);
  const skillPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../skills/code-review/SKILL.md");
  const args = buildReviewerArgs({
    model: request.model,
    thinkingLevel: request.thinkingLevel,
    skillPath,
    prompt: reviewPrompt(request, diff),
  });
  const invocation = getPiInvocation(args);
  const result = await runProcess(invocation.command, invocation.args, request.cwd, request.signal);
  const output = finalAssistantText(result.stdout);
  if (result.code !== 0 || !output) {
    throw new Error(result.stderr.trim() || output || `Independent reviewer exited with code ${result.code}`);
  }
  return { output };
}
