import { readFileSync, existsSync } from "node:fs";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const packageJson = JSON.parse(read("package.json") || "{}");
const scripts = packageJson.scripts ?? {};
const readme = read("README.md");
const commitPlan = read("COMMIT_PLAN.md");
const typecheckScript = scripts.typecheck ?? "";

const checks = [
  ["defines npm test", typeof scripts.test === "string"],
  ["defines npm run typecheck", typeof scripts.typecheck === "string"],
  ["defines npm run lint", typeof scripts.lint === "string"],
  ["adds tsconfig typecheck config", existsSync("tsconfig.json")],
  ["typecheck uses tsconfig", /\btsc\b/.test(typecheckScript) && /\btsconfig\.json\b/.test(typecheckScript)],
  ["documents local commands", /\bnpm\s+run\s+(test|typecheck|lint)\b|\bnpm\s+test\b/i.test(readme)],
  ["adds review grouping note", /\b(commit|review|change)\b/i.test(commitPlan)],
];
const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length > 0) {
  console.error("package baseline: failed checks: " + failed.join(", "));
  process.exit(1);
}
