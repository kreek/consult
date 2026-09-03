// Optional legacy extension for users who explicitly accept OpenAI priority-tier billing.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const SERVICE_TIER = "priority";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpenAICodexResponsesPayload(payload: unknown): payload is Record<string, unknown> {
  if (!isRecord(payload)) return false;

  const model = payload.model;
  if (typeof model === "string" && model.includes("codex")) return true;

  return (
    payload.stream === true &&
    typeof payload.instructions === "string" &&
    Array.isArray(payload.input) &&
    payload.tool_choice === "auto" &&
    "prompt_cache_key" in payload
  );
}

export default function openaiCodexFastMode(pi: ExtensionAPI) {
  pi.on("before_provider_request", (event) => {
    if (!isOpenAICodexResponsesPayload(event.payload)) return;

    return {
      ...event.payload,
      service_tier: SERVICE_TIER,
    };
  });
}
