import { readFileSync, existsSync } from "node:fs";

const path = "docs/checkout-validation.md";
const content = existsSync(path) ? readFileSync(path, "utf8") : "";
const checks = [
  ["created docs/checkout-validation.md", content.length > 0],
  ["states context", /\bcontext\b/i.test(content)],
  ["states a decision", /\bdecision\b/i.test(content)],
  ["describes alternatives", /\balternatives?\b/i.test(content)],
  ["covers consequences or follow-up", /\b(consequences?|follow[- ]?up)\b/i.test(content)],
  ["names the validation boundary", /\b(boundary|validation)\b/i.test(content)],
];
const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length > 0) {
  console.error("checkout validation note: failed checks: " + failed.join(", "));
  process.exit(1);
}
