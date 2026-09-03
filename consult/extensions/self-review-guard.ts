// Enforces review by a fresh, read-only Pi subprocess after production changes.
import type { ExtensionAPI, ExtensionContext, ToolResultEvent } from "@earendil-works/pi-coding-agent";

import { isProductionFile } from "../src/proof/file-classification.js";
import { detectsShellWritePattern, extractRedirectTargets } from "../src/proof/shell-detection.js";
import {
  type ReviewRequest,
  type ReviewResult,
  runIndependentReview,
} from "../src/review/review-runner.js";

export const SELF_REVIEW_MARKER = "Consult independent review";
export const REVIEW_STATE_ENTRY = "consult-independent-review-state";
const REVIEW_MESSAGE = "consult-independent-review";
const SHELL_PRODUCTION_MUTATION_PATTERN = /\b(sed\s+-i|mv|cp|touch|chmod|git\s+apply|patch)\b|writeFile|open\([^)]*['"]w/i;
const POWERSHELL_WRITE_PATTERN = /\b(Set-Content|Add-Content|Out-File|New-Item|Move-Item|Copy-Item|Remove-Item|Rename-Item)\b/i;
const MAX_AUTOMATIC_REVIEWS = 3;
const OUTPUT_FILE_RE = /\.(?:log|txt|out|tmp)$/i;

function isShellWriteTarget(target: string): boolean {
  return isProductionFile(target) && !OUTPUT_FILE_RE.test(target);
}

interface ReviewState {
  generation: number;
  reviewedGeneration: number;
  failedGeneration?: number;
  changedPaths: string[];
  intent: string;
}

interface ReviewDependencies {
  runReview: (request: ReviewRequest) => Promise<ReviewResult>;
}

function initialState(): ReviewState {
  return { generation: 0, reviewedGeneration: 0, changedPaths: [], intent: "" };
}

function isReviewState(value: unknown): value is ReviewState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ReviewState>;
  return (
    typeof state.generation === "number" &&
    typeof state.reviewedGeneration === "number" &&
    Array.isArray(state.changedPaths) &&
    state.changedPaths.every((item) => typeof item === "string") &&
    typeof state.intent === "string"
  );
}

function restoreState(entries: unknown[]): ReviewState {
  let restored = initialState();
  for (const raw of entries) {
    const entry = (raw as { message?: unknown })?.message ?? raw;
    if ((entry as { type?: unknown })?.type !== "custom") continue;
    if ((entry as { customType?: unknown })?.customType !== REVIEW_STATE_ENTRY) continue;
    const data = (entry as { data?: unknown }).data;
    if (isReviewState(data)) restored = { ...data, changedPaths: [...data.changedPaths] };
  }
  return restored;
}

function stringInput(event: ToolResultEvent, key: string): string {
  const value = (event.input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function productionMutation(event: ToolResultEvent): string | undefined {
  if (event.isError) return undefined;
  if (event.toolName === "write" || event.toolName === "edit") {
    const filePath = stringInput(event, "path");
    return filePath && isProductionFile(filePath) ? filePath : undefined;
  }
  if (event.toolName === "bash") {
    const command = stringInput(event, "command");
    const targets = extractRedirectTargets(command);
    if (targets.some(isShellWriteTarget)) return "<shell mutation>";
    // A redirect aimed only at logs, scratch files, or /dev/null is not a production write,
    // but the rest of the command may still be one (`cp a src/b.ts 2>&1`), so keep checking.
    if (targets.length > 0 && detectsShellWritePattern(command)) return undefined;
    return SHELL_PRODUCTION_MUTATION_PATTERN.test(command) ? "<shell mutation>" : undefined;
  }
  if (event.toolName === "powershell") {
    return POWERSHELL_WRITE_PATTERN.test(stringInput(event, "command")) ? "<PowerShell mutation>" : undefined;
  }
  return undefined;
}

function reviewRequest(state: ReviewState, ctx: ExtensionContext): ReviewRequest {
  return {
    cwd: ctx.cwd,
    model: ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined,
    thinkingLevel: ctx.thinkingLevel,
    changedPaths: [...state.changedPaths],
    intent: state.intent,
    signal: ctx.signal,
  };
}

function reviewFollowUp(output: string): string {
  return [
    `${SELF_REVIEW_MARKER} (fresh Pi subprocess, read-only tools):`,
    output,
    "Address every must-fix finding. If corrections change production code, Consult will launch another fresh reviewer.",
    "If there are no findings, report the independent review result and residual risk in the final response.",
  ].join("\n\n");
}

/** Build the independent-review extension with an injectable subprocess runner. */
export function createIndependentReviewExtension(dependencies: ReviewDependencies) {
  return function independentReviewExtension(pi: ExtensionAPI) {
    let state = initialState();
    let reviewInFlight = false;
    let automaticReviewCount = 0;

    const persist = () => pi.appendEntry(REVIEW_STATE_ENTRY, { ...state, changedPaths: [...state.changedPaths] });

    const runReview = async (ctx: ExtensionContext, force = false) => {
      if (reviewInFlight) return;
      if (!force && state.reviewedGeneration >= state.generation) return;
      if (!force && state.failedGeneration === state.generation) return;
      if (!force && automaticReviewCount >= MAX_AUTOMATIC_REVIEWS) {
        state = { ...state, reviewedGeneration: state.generation };
        persist();
        await pi.sendMessage(
          {
            customType: REVIEW_MESSAGE,
            content: `${SELF_REVIEW_MARKER} review limit reached after ${MAX_AUTOMATIC_REVIEWS} automatic rounds. Report the remaining changed paths as unresolved review risk or run /consult:self-review manually.`,
            display: true,
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
        return;
      }

      reviewInFlight = true;
      if (!force) automaticReviewCount += 1;
      const targetGeneration = state.generation;
      try {
        const result = await dependencies.runReview(reviewRequest(state, ctx));
        state = { ...state, reviewedGeneration: targetGeneration, failedGeneration: undefined };
        persist();
        await pi.sendMessage(
          { customType: REVIEW_MESSAGE, content: reviewFollowUp(result.output), display: true },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } catch (error) {
        state = { ...state, failedGeneration: targetGeneration };
        persist();
        const message = error instanceof Error ? error.message : String(error);
        await pi.sendMessage(
          {
            customType: REVIEW_MESSAGE,
            content: `${SELF_REVIEW_MARKER} failed: ${message}\n\nDo not claim independent review passed; report it as blocked.`,
            display: true,
          },
          { triggerTurn: true, deliverAs: "followUp" },
        );
      } finally {
        reviewInFlight = false;
      }
    };

    pi.registerCommand("consult:self-review", {
      description: "Run an independent review in a fresh Pi subprocess",
      handler: async (_args, ctx) => {
        await ctx.waitForIdle();
        await runReview(ctx, true);
      },
    });

    pi.on("session_start", (_event, ctx) => {
      state = restoreState(ctx.sessionManager.getBranch());
    });

    pi.on("session_tree", (_event, ctx) => {
      state = restoreState(ctx.sessionManager.getBranch());
    });

    pi.on("before_agent_start", (event) => {
      if (!String(event.prompt).includes(SELF_REVIEW_MARKER)) {
        // A new user task starts a new review budget; the cap bounds one correction chain, not the session.
        automaticReviewCount = 0;
        state = { ...state, intent: String(event.prompt ?? state.intent) };
      }
    });

    pi.on("tool_result", (event) => {
      const changedPath = productionMutation(event);
      if (!changedPath) return;
      state = {
        ...state,
        generation: state.generation + 1,
        failedGeneration: undefined,
        changedPaths: [...new Set([...state.changedPaths, changedPath])],
      };
      persist();
    });

    pi.on("agent_settled", async (_event, ctx) => {
      await runReview(ctx);
    });
  };
}

export default createIndependentReviewExtension({ runReview: runIndependentReview });
