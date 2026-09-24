import { readFileSync } from "node:fs";

const html = readFileSync("public/index.html", "utf8");
const emailInput = html.match(/<input\b[^>]*\bid=["']email["'][^>]*>/i)?.[0] ?? "";
const submitButton = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/i)?.[0] ?? "";
const statusElement = html.match(/<(?:p|div|span)\b[^>]*\bid=["']status["'][^>]*>/i)?.[0] ?? "";
const labelText = html.match(/<label[^>]+for=["']email["'][^>]*>([\s\S]*?)<\/label>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";

const checks = [
  ["email input has an explicit text label", labelText.length > 0],
  ["email input is not placeholder-only", /\bplaceholder=/i.test(emailInput) ? labelText.length > 0 : true],
  ["submit control is a native submit button", /<button\b/i.test(submitButton) && !/\btype=["']button["']/i.test(submitButton)],
  ["status region is announced politely", /\b(aria-live=["']polite["']|role=["']status["'])\b/i.test(statusElement)],
  ["does not use a clickable div submit", !/<div\b[^>]*(onclick|role=["']button["'])[^>]*>[\s\S]*subscribe/i.test(html)],
];
const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length > 0) {
  console.error("subscription form: failed checks: " + failed.join(", "));
  process.exit(1);
}
