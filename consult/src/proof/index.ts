// Registers Consult's branch-aware proof-first command, tools, and lifecycle hooks.
import { type ExtensionAPI, type ExtensionContext, isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { createProofController, PROOF_STATE_ENTRY } from "./proof-controller.js";
import { detectsShellWritePattern } from "./shell-detection.js";

const POWERSHELL_WRITE_PATTERN = /\b(Set-Content|Add-Content|Out-File|New-Item|Move-Item|Copy-Item|Remove-Item|Rename-Item)\b/i;

export default function proofExtension(pi: ExtensionAPI) {
  const controller = createProofController({
    persist: (snapshot) => pi.appendEntry(PROOF_STATE_ENTRY, snapshot),
  });

  const enable = async (args: string, ctx: ExtensionContext) => {
    const command = args.trim();
    return controller.enable(ctx, command ? { command, cwd: ctx.cwd } : undefined);
  };

  pi.registerCommand("proof", {
    description: "Start proof-first mode with an optional test command, or use /proof cancel",
    handler: async (args, ctx) => {
      if (args.trim() === "cancel") {
        controller.cancel(ctx);
        return;
      }
      if (controller.getPhase() !== "off") {
        ctx.ui.notify(`Proof is ${controller.getPhase()}; use /proof cancel to stop`, "warning");
        return;
      }
      await enable(args, ctx);
    },
  });

  pi.registerTool({
    name: "proof_start",
    label: "Proof Start",
    description: "Enable proof-first mode before changing implementation when a failing behavior proof is appropriate.",
    parameters: Type.Object({
      command: Type.Optional(Type.String({ description: "Focused test command; inferred when omitted" })),
      cwd: Type.Optional(Type.String({ description: "Directory in which the test command runs" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const message = await controller.enable(ctx, { command: params.command, cwd: params.cwd ?? ctx.cwd });
      return { content: [{ type: "text", text: message }], details: {} };
    },
  });

  pi.registerTool({
    name: "proof_done",
    label: "Proof Done",
    description: "Complete proof-first mode after fresh passing evidence covers the latest mutation.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const result = controller.complete(ctx);
      if (!result.ok) throw new Error(result.message);
      return { content: [{ type: "text", text: result.message }], details: {} };
    },
  });

  pi.on("tool_call", (event, ctx) => {
    if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
      return controller.handleProductionWrite(event.input.path, ctx);
    }
    if (controller.getPhase() !== "specifying") return;
    if (isToolCallEventType("bash", event) && detectsShellWritePattern(event.input.command)) {
      return { block: true, reason: "Proof is specifying: shell writes are blocked until a failing proof exists" };
    }
    if (isToolCallEventType("powershell", event) && POWERSHELL_WRITE_PATTERN.test(event.input.command)) {
      return { block: true, reason: "Proof is specifying: PowerShell writes are blocked until a failing proof exists" };
    }
  });

  pi.on("tool_result", async (event, ctx) => controller.handleFileToolResult(event, ctx));
  pi.on("tool_result", (event) => controller.handleShellWriteWarning(event));
  pi.on("tool_result", (event, ctx) => controller.handleManualTestRun(event, ctx));

  pi.on("turn_end", async (_event, ctx) => {
    const evidence = await controller.flushPendingTests(ctx);
    if (!evidence) return;
    await pi.sendMessage(
      { customType: "consult-proof-result", content: evidence, display: true },
      { deliverAs: "steer", triggerTurn: false },
    );
  });

  pi.on("before_agent_start", (event) => ({ systemPrompt: controller.buildSystemPrompt(event.systemPrompt) }));
  pi.on("session_start", (_event, ctx) => controller.restore(ctx.sessionManager.getBranch(), ctx));
  pi.on("session_tree", (_event, ctx) => controller.restore(ctx.sessionManager.getBranch(), ctx));
  pi.on("session_shutdown", () => controller.shutdown());
}
