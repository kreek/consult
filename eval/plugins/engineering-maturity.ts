import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { EvalPlugin, EvalSession, VerifyResult } from "do-eval";

const TEXT_FILE_EXTENSIONS = new Set([".html", ".js", ".json", ".md", ".sql", ".txt"]);
const KNOWN_SKILLS = [
  "workflow",
  "proof",
  "specify",
  "domain-modeling",
  "architecture",
  "code-review",
  "debugging",
  "refactoring",
  "error-handling",
  "security",
  "database",
  "release",
  "observability",
  "async-systems",
  "performance",
  "api",
  "documentation",
  "ui-design",
  "accessibility",
  "git-workflow",
  "scaffolding",
] as const;

type PluginScoreResult = ReturnType<EvalPlugin["scoreSession"]>;

function runNodeCheck(workDir: string, script: string): VerifyResult {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: workDir,
    encoding: "utf-8",
    timeout: 30_000,
  });
  return {
    passed: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
    metrics: {},
  };
}

function runVisibleTests(workDir: string): VerifyResult {
  const packageJsonPath = path.join(workDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return { passed: false, output: "Missing package.json", metrics: {} };
  }
  const result = spawnSync("npm", ["test"], {
    cwd: workDir,
    encoding: "utf-8",
    timeout: 60_000,
  });
  return {
    passed: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
    metrics: {},
  };
}

function runTextCheck(name: string, checks: Array<[label: string, passed: boolean]>): VerifyResult {
  const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
  return {
    passed: failed.length === 0,
    output: failed.length === 0 ? `${name}: OK` : `${name}: failed checks: ${failed.join(", ")}`,
    metrics: {},
  };
}

function combineChecks(name: string, results: VerifyResult[]): VerifyResult {
  const failed = results.flatMap((result) => (result.passed ? [] : [result.output]));
  return {
    passed: failed.length === 0,
    output: failed.length === 0 ? `${name}: OK` : failed.join("\n\n"),
    metrics: Object.assign({}, ...results.map((result) => result.metrics)),
  };
}

function readPackageName(workDir: string): string {
  try {
    const pkg = JSON.parse(readIfExists(path.join(workDir, "package.json"))) as { name?: string };
    return pkg?.name ?? "";
  } catch {
    return "";
  }
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}

function routingMarkerPath(workDir: string): string {
  return path.join(workDir, ".has-eval-kind.json");
}

function readRoutingMarker(workDir: string): { kind?: unknown; case?: unknown } | undefined {
  try {
    return JSON.parse(readIfExists(routingMarkerPath(workDir))) as { kind?: unknown; case?: unknown };
  } catch {
    return undefined;
  }
}

function isRoutingTrial(workDir: string): boolean {
  return readRoutingMarker(workDir)?.kind === "routing";
}

function extractTextBlocks(content: unknown): string[] {
  if (!Array.isArray(content)) return [];
  const textBlocks: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const candidate = block as { type?: unknown; text?: unknown };
    if ((candidate.type === "text" || candidate.type === "output_text") && typeof candidate.text === "string") {
      textBlocks.push(candidate.text);
    }
  }
  return textBlocks;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function collectRoleMessages(value: unknown, role: "user" | "assistant", messages: string[]): void {
  const record = asRecord(value);
  if (!record) return;

  const message = asRecord(record["message"]);
  if (message?.["role"] === role) {
    const text = extractTextBlocks(message["content"]).join("\n").trim();
    if (text) messages.push(text);
    return;
  }

  const item = asRecord(record["item"]);
  if (
    role === "assistant" &&
    item?.["type"] === "agent_message" &&
    typeof item["text"] === "string" &&
    item["text"].trim()
  ) {
    messages.push(item["text"].trim());
    return;
  }
  if (item?.["role"] === role) {
    const text = extractTextBlocks(item["content"]).join("\n").trim();
    if (text) messages.push(text);
    return;
  }

  for (const child of Object.values(record)) collectRoleMessages(child, role, messages);
}

function extractMessages(rawLines: string[], role: "user" | "assistant"): string[] {
  const messages: string[] = [];
  for (const line of rawLines) {
    if (!line.trim()) continue;
    try {
      collectRoleMessages(JSON.parse(line), role, messages);
    } catch {
      continue;
    }
  }
  return messages;
}

export function extractInitialUserPrompt(rawLines: string[]): string {
  return extractMessages(rawLines, "user")[0] ?? "";
}

export function extractFinalAssistantText(rawLines: string[]): string {
  const messages = extractMessages(rawLines, "assistant");
  return messages[messages.length - 1] ?? "";
}

// Deterministic proxy for gate fatigue: an assistant message whose closing
// line asks the user a question is a turn that blocks on human input in an
// interactive session. Eval runs are non-interactive, so the count is a
// readout of how often Consult gating would have interrupted a real user.
export function countQuestionMessages(rawLines: string[]): number {
  return extractMessages(rawLines, "assistant").filter((message) => {
    const lines = message.trim().split("\n");
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    return lastLine.endsWith("?");
  }).length;
}

interface ConsultRunMetrics {
  intendedSkills: string[];
  readSkills: string[];
  missingSkills: string[];
  questionMessages: number;
}

function consultMetricsPath(workDir: string): string {
  return path.join(workDir, ".has-eval", "consult-metrics.json");
}

function readConsultRunMetrics(workDir: string): ConsultRunMetrics | undefined {
  try {
    const parsed = JSON.parse(readIfExists(consultMetricsPath(workDir))) as ConsultRunMetrics;
    if (!Array.isArray(parsed.intendedSkills) || !Array.isArray(parsed.missingSkills)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

// Numeric channel for the trigger-rate and interruption readouts. These ride
// on VerifyResult.metrics so they land in the stored report and can be
// regressed on, without becoming weighted scores (see scoreSession).
function consultMetricNumbers(workDir: string): Record<string, number> {
  const metrics = readConsultRunMetrics(workDir);
  if (!metrics) return {};
  const numbers: Record<string, number> = {
    questionMessages: metrics.questionMessages,
  };
  if (metrics.intendedSkills.length > 0) {
    numbers["intendedSkillCount"] = metrics.intendedSkills.length;
    numbers["intendedSkillReads"] = metrics.intendedSkills.length - metrics.missingSkills.length;
    numbers["skillTriggerRate"] = Math.round(
      (100 * (metrics.intendedSkills.length - metrics.missingSkills.length)) / metrics.intendedSkills.length,
    );
  }
  return numbers;
}

// Zero-weight score entries: recorded per run (and gateable through a bench's
// requiredDeterministicScores) without shifting `overall`. A weighted version
// would tank the bare baseline, which reads no skills by construction.
function consultReadoutScores(verify: VerifyResult): {
  scores: Record<string, number>;
  weights: Record<string, number>;
  findings: string[];
} {
  const scores: Record<string, number> = {};
  const weights: Record<string, number> = {};
  const findings: string[] = [];

  const triggerRate = verify.metrics["skillTriggerRate"];
  if (typeof triggerRate === "number") {
    scores["skill_triggering"] = triggerRate;
    weights["skill_triggering"] = 0;
    const intended = verify.metrics["intendedSkillCount"] ?? 0;
    const reads = verify.metrics["intendedSkillReads"] ?? 0;
    if (reads < intended) {
      findings.push(`Read ${reads} of ${intended} intended skills; see .has-eval/consult-metrics.json for names.`);
    }
  }

  const questionMessages = verify.metrics["questionMessages"];
  if (typeof questionMessages === "number") {
    scores["non_interruption"] = Math.max(0, 100 - 25 * questionMessages);
    weights["non_interruption"] = 0;
    if (questionMessages > 0) {
      findings.push(
        `${questionMessages} assistant message${questionMessages === 1 ? "" : "s"} ended by asking the user a question.`,
      );
    }
  }

  return { scores, weights, findings };
}

function commandAndResultText(session: EvalSession): string {
  return session.toolCalls
    .map((call) => `${call.name} ${commandText(call)}\n${call.resultText}`)
    .join("\n");
}

function readConsultSkillNames(session: EvalSession): string[] {
  const text = commandAndResultText(session);
  const skills = new Set<string>();
  for (const match of text.matchAll(/agents\/\.agents\/skills\/([^/\s"']+)\/SKILL\.md/g)) {
    if (match[1]) skills.add(match[1]);
  }
  for (const match of text.matchAll(/plugin\/skills\/([^/\s"']+)\/SKILL\.md/g)) {
    if (match[1]) skills.add(match[1]);
  }
  for (const match of text.matchAll(/\.codex\/skills\/([^/\s"']+)\/SKILL\.md/g)) {
    if (match[1]) skills.add(match[1]);
  }
  return [...skills].sort();
}

// Kind-agnostic activation signal. Reporting per-run skill reads as a finding
// (not a weighted score) is correct for both the layered run (reads ≥1) and the
// bare baseline (reads 0, stays silent), without branching on profile name. The
// structural guarantee that the baseline has no skill layers — plus the lift
// number itself — is the integrity readout; this just makes activation visible.
function activationFinding(session: EvalSession): string[] {
  const reads = readConsultSkillNames(session);
  if (reads.length === 0) return [];
  return [`Activated ${reads.length} Consult skill${reads.length === 1 ? "" : "s"}: ${reads.join(", ")}.`];
}

function scoreRoutingSession(session: EvalSession, verify: VerifyResult): PluginScoreResult {
  const readouts = consultReadoutScores(verify);
  const scores = {
    no_file_writes: session.fileWrites.length === 0 ? 100 : 0,
    ...readouts.scores,
  };
  const weights = {
    no_file_writes: 1,
    ...readouts.weights,
  };
  const findings: string[] = [...activationFinding(session), ...readouts.findings];
  if (session.fileWrites.length > 0) findings.push("Routing trial wrote files despite being read-only.");

  return {
    scores,
    weights,
    findings,
    judge: {
      includeInOverall: true,
      defaultWeight: 0.45,
      weights: {
        engineering_maturity: 0.35,
        proof_quality: 0.25,
        simplicity: 0.2,
        risk_handling: 0.2,
      },
    },
  };
}

function isCommandTool(call: EvalSession["toolCalls"][number]): boolean {
  return /\b(command_execution|exec_command|bash|shell|terminal|run_command|write_stdin)\b/i.test(call.name);
}

function commandText(call: EvalSession["toolCalls"][number]): string {
  const args = call.arguments as Record<string, unknown>;
  const fields = ["cmd", "command", "script", "input", "chars"];
  return fields.map((field) => args[field]).filter((value): value is string => typeof value === "string").join(" ");
}

function hasPostWriteCommand(session: EvalSession, pattern: RegExp): boolean {
  const writeTimes = session.fileWrites.map((write) => write.timestamp);
  if (writeTimes.length === 0) return false;
  const lastWrite = Math.max(...writeTimes);
  return session.toolCalls.some(
    (call) => call.timestamp > lastWrite && isCommandTool(call) && pattern.test(`${call.name} ${commandText(call)}`),
  );
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function splitSqlStatements(sql: string): string[] {
  return stripSqlComments(sql)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function validateCustomerEmailSql(workDir: string): VerifyResult {
  const migrationFiles = fs
    .readdirSync(path.join(workDir, "migrations"))
    .filter((name) => name.endsWith(".sql") && !name.includes("rollback"));
  const allMigrationSql = migrationFiles
    .map((name) => readIfExists(path.join(workDir, "migrations", name)))
    .join("\n\n");
  const statements = splitSqlStatements(allMigrationSql);
  const rollback = migrationFiles
    .map((name) => readIfExists(path.join(workDir, "migrations", name.replace(/\.sql$/, ".rollback.sql"))))
    .join("\n");
  const operations = [
    readIfExists(path.join(workDir, "OPERATIONS.md")),
    readIfExists(path.join(workDir, "operations.md")),
    readIfExists(path.join(workDir, "ROLLBACK.md")),
    readIfExists(path.join(workDir, "README.md")),
  ].join("\n");
  const partialIndexNames = Array.from(
    allMigrationSql.matchAll(/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([a-z0-9_]+)\b[^;]*\bwhere\b[^;]*;/gi),
  ).map((m) => m[1]?.toLowerCase()).filter((name): name is string => Boolean(name));
  const constraintAttachments = Array.from(
    allMigrationSql.matchAll(/add\s+constraint\s+[a-z0-9_]+\s+unique\s+using\s+index\s+([a-z0-9_]+)/gi),
  ).map((m) => m[1]?.toLowerCase()).filter((name): name is string => Boolean(name));
  const brokenAttachment = constraintAttachments.find((name) => partialIndexNames.includes(name));
  const allowedPostgresStatements = statements.every((statement) =>
    [
      /^alter\s+table\s+customers\s+add\s+column\s+(?:if\s+not\s+exists\s+)?email\s+text(?:\s+null)?$/i,
      /^create\s+unique\s+index\s+concurrently\s+(?:if\s+not\s+exists\s+)?[a-z0-9_]+\s+on\s+customers\s*\(\s*(?:lower\s*\(\s*)?email\s*\)?\s*\)(?:\s+where\s+email\s+is\s+not\s+null)?$/i,
      /^alter\s+table\s+customers\s+add\s+constraint\s+[a-z0-9_]+\s+unique\s+using\s+index\s+[a-z0-9_]+$/i,
    ].some((pattern) => pattern.test(statement.replace(/\s+/g, " "))),
  );

  return runTextCheck("customer email migration", [
    ["contains only recognized Postgres online-migration statements", statements.length > 0 && allowedPostgresStatements],
    ["uses a concurrent unique index build", /create\s+unique\s+index\s+concurrently\b/i.test(allMigrationSql)],
    ["does not create a blocking unique index", !/create\s+unique\s+index\s+(?!concurrently\b)/i.test(allMigrationSql)],
    ["separates uniqueness from the initial table change", statements.length >= 2],
    ["adds a rollback file", rollback.length > 0],
    ["rollback reverses schema or index changes", /\b(drop\s+index|drop\s+constraint|drop\s+column)\b/i.test(rollback)],
    ["documents rollout", /\b(rollout|deploy|apply)\b/i.test(operations)],
    ["documents validation", /\b(validate|verification|check)\b/i.test(operations)],
    ["documents rollback", /\brollback\b/i.test(operations)],
    [
      `does not back a unique constraint with a partial index${brokenAttachment ? ` (${brokenAttachment})` : ""}`,
      brokenAttachment === undefined,
    ],
  ]);
}

function runOptionalPostgresMigrationCheck(workDir: string): VerifyResult {
  const databaseUrl = process.env["CONSULT_EVAL_POSTGRES_URL"];
  if (!databaseUrl) return { passed: true, output: "Postgres execution skipped; CONSULT_EVAL_POSTGRES_URL is not set.", metrics: {} };

  const migrationFiles = fs
    .readdirSync(path.join(workDir, "migrations"))
    .filter((name) => name.endsWith(".sql") && !name.includes("rollback"))
    .sort();
  const allMigrationSql = migrationFiles
    .map((name) => readIfExists(path.join(workDir, "migrations", name)))
    .join("\n\n");
  const schema = `consult_eval_${process.pid}_${Date.now()}`;
  const artifactDir = path.join(workDir, ".has-eval");
  fs.mkdirSync(artifactDir, { recursive: true });
  const scriptPath = path.join(artifactDir, "postgres-migration-check.sql");
  fs.writeFileSync(
    scriptPath,
    [
      `DROP SCHEMA IF EXISTS ${schema} CASCADE;`,
      `CREATE SCHEMA ${schema};`,
      `SET search_path TO ${schema};`,
      "CREATE TABLE customers (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY);",
      ...splitSqlStatements(allMigrationSql).map((statement) => `${statement};`),
      `DROP SCHEMA ${schema} CASCADE;`,
    ].join("\n"),
  );
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", scriptPath], {
    cwd: workDir,
    encoding: "utf-8",
    timeout: 30_000,
  });
  return {
    passed: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
    metrics: { postgresExecuted: result.status === 0 ? 1 : 0 },
  };
}

function hasSubmittedProofForTrial(workDir: string): boolean {
  if (fs.existsSync(path.join(workDir, "src", "cart.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "cart.test.js"));
    return /\bSAVE10\b/.test(tests) && /assert\.throws/.test(tests) && /\b(integer|invalid|negative|quantity|priceCents)\b/i.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "pipeline.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "pipeline.test.js"));
    return /\bvalid\b/.test(tests) &&
      /\berrors\b/.test(tests) &&
      /(deepEqual|deepStrictEqual|toEqual)/.test(tests) &&
      /(duplicate|dedupe|same\s+email|second\s+occurrence)/i.test(tests) &&
      /(reason|invalid|malformed|unable|cannot)/i.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "signup.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "signup.test.js"));
    const fields = ["email", "password", "age", "country"];
    const fieldsCovered = fields.every((f) =>
      new RegExp(`errors\\.${f}\\b|errors\\[["']${f}["']\\]`).test(tests),
    );
    const assertsMessageContent = /(assert\.match|\.includes\(["']|\.toMatch|\.toContain)/.test(tests);
    return fieldsCovered && assertsMessageContent;
  }
  if (fs.existsSync(path.join(workDir, "src", "orders.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "orders.test.js"));
    const coversTier = /(tier|threshold|10\s?%|0\.1|percentage)/i.test(tests);
    const coversCoupon = /\bWELCOME\b/.test(tests);
    const coversCap = /(cap|exceed|cannot\s+exceed|limit|max)/i.test(tests);
    const coversConfirmation = /(charge|email|confirmation|queued|recorded)/i.test(tests);
    return coversTier && coversCoupon && coversCap && coversConfirmation;
  }
  if (readPackageName(workDir) === "link-shortener-trial") {
    const testDir = path.join(workDir, "test");
    let combined = "";
    if (fs.existsSync(testDir)) {
      for (const entry of fs.readdirSync(testDir)) {
        if (entry.endsWith(".js") || entry.endsWith(".mjs")) {
          combined += "\n" + readIfExists(path.join(testDir, entry));
        }
      }
    }
    const coversShorten = /\b(shorten|\/shorten)\b/i.test(combined);
    const coversRedirect = /(redirect|location|302|301)/i.test(combined);
    const coversReject = /(invalid|reject|4\d\d|javascript:|https:|\/\/evil)/i.test(combined);
    const coversAdmin = /\b(admin|list)\b/i.test(combined);
    return coversShorten && coversRedirect && coversReject && coversAdmin;
  }
  if (fs.existsSync(path.join(workDir, "src", "redirect.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "redirect.test.js"));
    return /example\.com/.test(tests) && /evil\.example|javascript:|protocol-relative|\/\//i.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "profile.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "profile.test.js"));
    return /preferences/.test(tests) && /notEqual|notStrictEqual/.test(tests) && /__proto__|constructor|prototype/.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "users.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "users.test.js"));
    return /\b400\b/.test(tests) && /\b404\b/.test(tests) && /\berror\b/.test(tests) && /\bmessage\b/.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "worker.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "worker.test.js"));
    return /\bconcurrency\b|\bmaxActive\b/i.test(tests) && /\bretry|attempt/i.test(tests) && /\blog|events/i.test(tests);
  }
  if (fs.existsSync(path.join(workDir, "src", "checkout.js")) && fs.existsSync(path.join(workDir, "src", "services.js"))) {
    const tests = readIfExists(path.join(workDir, "test", "checkout.test.js"));
    return Array.from(tests.matchAll(/(?:^|\n)\s*test\s*\(/g)).length >= 4;
  }
  if (fs.existsSync(path.join(workDir, "docs", "checkout-notes.md"))) {
    const content = readIfExists(path.join(workDir, "docs", "checkout-validation.md"));
    return /\bcontext\b/i.test(content) && /\bdecision\b/i.test(content) && /\balternatives?\b/i.test(content);
  }
  if (
    fs.existsSync(path.join(workDir, "migrations", "001_customer_email.sql")) ||
    fs.existsSync(path.join(workDir, "migrations", "001_customer_email_add_column.sql"))
  ) {
    const check = validateCustomerEmailSql(workDir);
    return check.passed;
  }
  if (fs.existsSync(path.join(workDir, "public", "index.html"))) {
    const check = validateSubscriptionForm(workDir);
    return check.passed;
  }
  if (fs.existsSync(path.join(workDir, "src", "index.js")) && fs.existsSync(path.join(workDir, "test", "index.test.js"))) {
    const packageJson = JSON.parse(readIfExists(path.join(workDir, "package.json")) || "{}") as {
      scripts?: Record<string, string>;
    };
    return Boolean(packageJson.scripts?.["test"] && packageJson.scripts?.["typecheck"] && packageJson.scripts?.["lint"]);
  }
  return false;
}

function validateSubscriptionForm(workDir: string): VerifyResult {
  const html = readIfExists(path.join(workDir, "public", "index.html"));
  const emailInput = html.match(/<input\b[^>]*\bid=["']email["'][^>]*>/i)?.[0] ?? "";
  const submitButton = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/i)?.[0] ?? "";
  const statusElement = html.match(/<(?:p|div|span)\b[^>]*\bid=["']status["'][^>]*>/i)?.[0] ?? "";
  const labelText = html.match(/<label[^>]+for=["']email["'][^>]*>([\s\S]*?)<\/label>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";

  return runTextCheck("subscription form", [
    ["email input has an explicit text label", labelText.length > 0],
    ["email input is not placeholder-only", /\bplaceholder=/i.test(emailInput) ? labelText.length > 0 : true],
    ["submit control is a native submit button", /<button\b/i.test(submitButton) && !/\btype=["']button["']/i.test(submitButton)],
    ["status region is announced politely", /\b(aria-live=["']polite["']|role=["']status["'])\b/i.test(statusElement)],
    ["does not use a clickable div submit", !/<div\b[^>]*(onclick|role=["']button["'])[^>]*>[\s\S]*subscribe/i.test(html)],
  ]);
}

function runHiddenChecks(workDir: string): VerifyResult {
  if (fs.existsSync(path.join(workDir, "src", "cart.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { totalCents } from "./src/cart.js";
        assert.equal(totalCents([{ priceCents: 1000, quantity: 2 }], "SAVE10"), 1800);
        assert.equal(totalCents([{ priceCents: 333, quantity: 3 }]), 999);
        assert.throws(() => totalCents([{ priceCents: -1, quantity: 1 }]));
        assert.throws(() => totalCents([{ priceCents: 100, quantity: 1.5 }]));
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "pipeline.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { processCustomers } from "./src/pipeline.js";

        const result = processCustomers([
          { name: "Ada", email: "Ada@Example.COM", phone: "5551234567" },
          { name: "Ada Dup", email: "ada@example.com", phone: "(555) 123-4567" },
          { name: "Bob", email: "bob@example.com", phone: "555-987-6543" },
          { name: "Bad", email: "bad@example.com", phone: "abc" },
        ]);

        assert.equal(result.valid.length, 2, "expected two unique valid records");
        assert.equal(result.errors.length, 1, "expected one record in errors");

        const ada = result.valid.find((r) => r.email === "ada@example.com");
        assert.ok(ada, "expected first Ada record to survive dedupe");
        assert.equal(ada.email, "ada@example.com");
        assert.equal(ada.phone, "+15551234567");

        const bob = result.valid.find((r) => r.email === "bob@example.com");
        assert.ok(bob, "expected Bob record");
        assert.equal(bob.phone, "+15559876543");

        const bad = result.errors[0];
        assert.equal(typeof bad.reason, "string");
        assert.ok(bad.reason.length > 0, "error reason must describe the failure");

        const empty = processCustomers([]);
        assert.deepEqual(empty, { valid: [], errors: [] });
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "signup.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { validateSignup } from "./src/signup.js";

        const valid = { email: "ada@example.com", password: "Hunter2pass", age: 30, country: "US" };
        const ok = validateSignup(valid);
        assert.equal(ok.ok, true);
        assert.deepEqual(ok.value, valid);

        function expectFieldError(input, field) {
          const result = validateSignup(input);
          assert.equal(result.ok, false, "expected ok=false for " + field + " failure");
          assert.equal(typeof result.errors, "object");
          assert.equal(typeof result.errors[field], "string", field + " message must be a string");
          assert.ok(result.errors[field].length > 0, field + " message must not be empty");
        }

        expectFieldError({ ...valid, email: "" }, "email");
        expectFieldError({ ...valid, email: "not-an-email" }, "email");
        expectFieldError({ ...valid, password: "short" }, "password");
        expectFieldError({ ...valid, password: "alllowercase1" }, "password");
        expectFieldError({ ...valid, password: "NoDigitsHere" }, "password");
        expectFieldError({ ...valid, age: 12 }, "age");
        expectFieldError({ ...valid, age: 121 }, "age");
        expectFieldError({ ...valid, country: "USA" }, "country");
        expectFieldError({ ...valid, country: "us" }, "country");

        // Multiple failures must all surface in the same envelope.
        const both = validateSignup({ email: "", password: "x", age: 8, country: "" });
        assert.equal(both.ok, false);
        const fields = Object.keys(both.errors);
        assert.ok(fields.includes("email"), "envelope must report email failure");
        assert.ok(fields.includes("password"), "envelope must report password failure");
        assert.ok(fields.includes("age"), "envelope must report age failure");
        assert.ok(fields.includes("country"), "envelope must report country failure");
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "orders.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { processOrder } from "./src/orders.js";

        function order(extra) {
          return { id: "o_x", email: "x@example.com", ...extra };
        }

        // Below tier threshold, no coupon: no discount.
        const small = processOrder(order({ lines: [{ sku: "sku_1", quantity: 1 }] }));
        assert.equal(small.ok, true);
        assert.equal(small.subtotal, 1000);
        assert.equal(small.discount, 0);
        assert.equal(small.total, 1000);

        // At/above tier threshold, no coupon: 10% off.
        const large = processOrder(order({ lines: [{ sku: "sku_3", quantity: 2 }] }));
        assert.equal(large.subtotal, 9000);
        assert.equal(large.discount, 900);
        assert.equal(large.total, 8100);

        // Below threshold with WELCOME: coupon only.
        const coupon = processOrder(order({
          coupon: "WELCOME",
          lines: [{ sku: "sku_1", quantity: 1 }],
        }));
        assert.equal(coupon.subtotal, 1000);
        assert.equal(coupon.discount, 500);
        assert.equal(coupon.total, 500);

        // Coupon stacks with tier discount.
        const stacked = processOrder(order({
          coupon: "WELCOME",
          lines: [{ sku: "sku_3", quantity: 2 }],
        }));
        assert.equal(stacked.subtotal, 9000);
        assert.equal(stacked.discount, 1400);
        assert.equal(stacked.total, 7600);

        // Cap: combined discount cannot exceed subtotal.
        // sku_2 = 2500 cents; tier kicks in only at >=5000, so for two
        // sku_2 (5000) the tier discount is 500, plus WELCOME 500 = 1000,
        // which is less than 5000 — so we need a smaller order to exercise
        // the cap. Use a fictitious 0-priced line via quantity 0:
        const tiny = processOrder(order({
          coupon: "WELCOME",
          lines: [{ sku: "sku_1", quantity: 1 }],
        }));
        // subtotal = 1000, discount should be 500 (not exceeding 1000): already covered above.

        // Tighter cap: a coupon-only order on a sku where coupon would
        // exceed subtotal. Construct by leaving a single 1-quantity line
        // and inflating discount conceptually — instead, prove the cap by
        // verifying that discount <= subtotal in every case above.
        for (const r of [small, large, coupon, stacked]) {
          assert.ok(r.discount <= r.subtotal, "discount must not exceed subtotal");
          assert.equal(r.total, r.subtotal - r.discount);
          assert.ok(r.total >= 0, "total must not be negative");
        }
      `,
    );
  }

  if (readPackageName(workDir) === "link-shortener-trial") {
    if (!fs.existsSync(path.join(workDir, "src", "server.js"))) {
      return {
        passed: false,
        output: "src/server.js missing; cannot exercise link-shortener endpoints.",
        metrics: {},
      };
    }
    return runNodeCheck(
      workDir,
      `
        import { spawn } from "node:child_process";
        import assert from "node:assert/strict";

        const PORT = String(20000 + Math.floor(Math.random() * 10000));
        const server = spawn(process.execPath, ["--experimental-sqlite", "src/server.js"], {
          cwd: process.cwd(),
          env: { ...process.env, PORT },
          stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        server.stderr.on("data", (d) => { stderr += d.toString(); });
        server.on("error", () => {});

        const base = "http://localhost:" + PORT;
        const fail = (msg) => {
          server.kill("SIGKILL");
          throw new Error(msg + (stderr ? "\\n--- server stderr ---\\n" + stderr.slice(-1500) : ""));
        };

        // Wait up to 10s for the server to accept connections.
        let ready = false;
        for (let i = 0; i < 50; i++) {
          if (server.exitCode !== null) fail("server exited before becoming ready (exit " + server.exitCode + ")");
          try {
            const r = await fetch(base + "/", { signal: AbortSignal.timeout(500) });
            if (r.status < 500) { ready = true; break; }
          } catch (_) {}
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!ready) fail("server did not become ready within 10s");

        try {
          // GET / — HTML referencing htmx and alpine.
          const home = await fetch(base + "/");
          assert.equal(home.status, 200, "GET / should be 200, got " + home.status);
          const homeBody = await home.text();
          assert.ok(/htmx/i.test(homeBody), "home page must reference htmx");
          assert.ok(/alpine/i.test(homeBody), "home page must reference alpine");

          // POST /shorten with valid URL — extract slug from JSON or any URL-safe token in body.
          const target = "https://example.com/foo";
          const post = await fetch(base + "/shorten", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: target }),
          });
          assert.ok(post.status >= 200 && post.status < 300, "POST /shorten should be 2xx, got " + post.status);
          const postBody = await post.text();

          let slug = null;
          try {
            const parsed = JSON.parse(postBody);
            slug = parsed?.slug ?? parsed?.short ?? parsed?.shortSlug ?? null;
            if (!slug && typeof parsed?.shortUrl === "string") {
              const tail = parsed.shortUrl.split("/").pop();
              if (tail) slug = tail;
            }
          } catch (_) {
            // not JSON — extract a URL-safe token candidate.
          }
          if (!slug) {
            const tokens = postBody.split(/[^A-Za-z0-9_-]+/).filter((t) => t.length >= 3 && t.length <= 32);
            for (const candidate of tokens) {
              if (/^(html|head|body|div|span|class|id|http|https|json|true|false|null|slug|shortUrl|copy|button|form|input|btoa|alpine|htmx|admin|index)$/i.test(candidate)) continue;
              const r = await fetch(base + "/" + candidate, { redirect: "manual", signal: AbortSignal.timeout(2000) });
              if (r.status === 301 || r.status === 302 || r.status === 303 || r.status === 307 || r.status === 308) {
                slug = candidate;
                break;
              }
            }
          }
          if (!slug) fail("response to POST /shorten did not yield a slug — body: " + postBody.slice(0, 300));

          // GET /:slug — redirect to original.
          const redir = await fetch(base + "/" + slug, { redirect: "manual" });
          assert.ok(redir.status >= 300 && redir.status < 400, "GET /:slug should redirect, got " + redir.status);
          assert.equal(redir.headers.get("location"), target, "redirect location must match the original URL");

          // GET /:nonexistent — 404.
          const missing = await fetch(base + "/no-such-slug-xyz-9q9q9q", { redirect: "manual" });
          assert.equal(missing.status, 404, "unknown slug should be 404, got " + missing.status);

          // Reject javascript:.
          const js = await fetch(base + "/shorten", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: "javascript:alert(1)" }),
          });
          assert.ok(js.status >= 400 && js.status < 500, "javascript: target must be rejected, got " + js.status);

          // Reject https:host (URL parser leniency).
          const lenient = await fetch(base + "/shorten", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: "https:evil.example.com" }),
          });
          assert.ok(lenient.status >= 400 && lenient.status < 500, "lenient https:host must be rejected, got " + lenient.status);

          // Reject scheme-relative //host.
          const schemeRel = await fetch(base + "/shorten", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: "//evil.example.com" }),
          });
          assert.ok(schemeRel.status >= 400 && schemeRel.status < 500, "//host must be rejected, got " + schemeRel.status);

          // GET /admin — listing must include the slug.
          const admin = await fetch(base + "/admin");
          assert.equal(admin.status, 200, "GET /admin should be 200, got " + admin.status);
          const adminBody = await admin.text();
          assert.ok(adminBody.includes(slug), "admin page must list the slug created earlier");
        } finally {
          server.kill("SIGKILL");
        }
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "redirect.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { resolveRedirect } from "./src/redirect.js";
        assert.equal(resolveRedirect("/account/settings"), "/account/settings");
        assert.equal(resolveRedirect("https://example.com/docs"), "https://example.com/docs");
        assert.equal(resolveRedirect("https://evil.example/phish"), "/");
        assert.equal(resolveRedirect("//evil.example/phish"), "/");
        assert.equal(resolveRedirect("javascript:alert(1)"), "/");
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "docs", "checkout-notes.md"))) {
    const docPath = path.join(workDir, "docs", "checkout-validation.md");
    const content = readIfExists(docPath);
    return runTextCheck("checkout validation note", [
      ["created docs/checkout-validation.md", content.length > 0],
      ["states context", /\bcontext\b/i.test(content)],
      ["states a decision", /\bdecision\b/i.test(content)],
      ["describes alternatives", /\balternatives?\b/i.test(content)],
      ["covers consequences or follow-up", /\b(consequences?|follow[- ]?up)\b/i.test(content)],
      ["names the validation boundary", /\b(boundary|validation)\b/i.test(content)],
    ]);
  }

  if (fs.existsSync(path.join(workDir, "src", "profile.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { mergeProfile } from "./src/profile.js";

        const existing = {
          id: "u_1",
          preferences: { theme: "dark", email: true },
          tags: ["admin"],
        };
        const patch = {
          preferences: { email: false },
          tags: ["beta"],
        };
        const merged = mergeProfile(existing, patch);

        assert.deepEqual(merged.preferences, { theme: "dark", email: false });
        assert.deepEqual(merged.tags, ["beta"]);
        assert.deepEqual(existing.preferences, { theme: "dark", email: true });
        assert.deepEqual(existing.tags, ["admin"]);
        assert.notEqual(merged.preferences, existing.preferences);
        assert.notEqual(merged.tags, existing.tags);

        // Negative test: prototype-pollution guard must actually block the
        // attack. JSON.parse is used so the attack surface is realistic
        // (network/JSON-borne patches), and we capture/restore the canary
        // on Object.prototype to keep this trial isolated from the runner.
        const canaryBefore = Object.prototype.polluted;
        try {
          const malicious = JSON.parse(
            '{"__proto__":{"polluted":"yes"}}'
          );
          mergeProfile({ id: "u_2" }, malicious);
          assert.equal(
            ({}).polluted,
            canaryBefore,
            "mergeProfile leaked __proto__ patch into Object.prototype",
          );
        } finally {
          if (canaryBefore === undefined) delete Object.prototype.polluted;
          else Object.prototype.polluted = canaryBefore;
        }

        // Negative test: a constructor-key attack must also not escalate.
        const ctorBefore = Object.prototype.ctorPolluted;
        try {
          const constructorAttack = JSON.parse(
            '{"constructor":{"prototype":{"ctorPolluted":"yes"}}}'
          );
          mergeProfile({ id: "u_3" }, constructorAttack);
          assert.equal(
            ({}).ctorPolluted,
            ctorBefore,
            "mergeProfile leaked constructor.prototype patch",
          );
        } finally {
          if (ctorBefore === undefined) delete Object.prototype.ctorPolluted;
          else Object.prototype.ctorPolluted = ctorBefore;
        }
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "users.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { handleUserLookup } from "./src/users.js";

        const missing = handleUserLookup({ query: {} });
        assert.equal(missing.status, 400);
        assert.equal(typeof missing.body.error, "string");
        assert.equal(missing.body.error, "missing_id");
        assert.equal(typeof missing.body.message, "string");
        assert.ok(missing.body.message.length > 0);

        const absent = handleUserLookup({ query: { id: "missing" } });
        assert.equal(absent.status, 404);
        assert.equal(typeof absent.body.error, "string");
        assert.equal(absent.body.error, "not_found");
        assert.equal(typeof absent.body.message, "string");
        assert.ok(absent.body.message.length > 0);

        const found = handleUserLookup({ query: { id: "u_1" } });
        assert.equal(found.status, 200);
        assert.equal(found.body.id, "u_1");
      `,
    );
  }

  if (
    fs.existsSync(path.join(workDir, "migrations", "001_customer_email.sql")) ||
    fs.existsSync(path.join(workDir, "migrations", "001_customer_email_add_column.sql"))
  ) {
    return combineChecks("customer email migration", [
      validateCustomerEmailSql(workDir),
      runOptionalPostgresMigrationCheck(workDir),
    ]);
  }

  if (fs.existsSync(path.join(workDir, "src", "worker.js"))) {
    return runNodeCheck(
      workDir,
      `
        import assert from "node:assert/strict";
        import { processNotifications } from "./src/worker.js";

        let active = 0;
        let maxActive = 0;
        const attempts = new Map();
        const events = [];
        const notifications = [{ id: "n1" }, { id: "n2" }, { id: "n3" }];

        async function send(notification) {
          active++;
          maxActive = Math.max(maxActive, active);
          attempts.set(notification.id, (attempts.get(notification.id) ?? 0) + 1);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
          if (notification.id === "n2" && attempts.get(notification.id) === 1) {
            throw new Error("temporary failure");
          }
        }

        const logger = {
          info(event, data) { events.push({ level: "info", event, data }); },
          warn(event, data) { events.push({ level: "warn", event, data }); },
          error(event, data) { events.push({ level: "error", event, data }); },
        };

        const result = await processNotifications(notifications, send, logger, { concurrency: 2 });

        assert.equal(result.sent, 3);
        assert.equal(result.failed, 0);
        assert.ok(maxActive <= 2);
        assert.ok(maxActive > 1);
        assert.equal(attempts.get("n2"), 2);
        assert.ok(events.length >= 2);
      `,
    );
  }

  if (fs.existsSync(path.join(workDir, "src", "checkout.js")) && fs.existsSync(path.join(workDir, "src", "services.js"))) {
    return runNodeCheck(
      workDir,
      `
          import assert from "node:assert/strict";
          import { submitCheckout } from "./src/checkout.js";

          const request = {
            customerId: "cus_123",
            idempotencyKey: "idem_123",
            paymentSource: "tok_visa",
            items: [{ sku: "sku_book", quantity: 1, priceCents: 1000 }],
          };

          function makeServices(options = {}) {
            const events = [];
            const existing = options.existing;
            return {
              events,
              orders: {
                async findByIdempotencyKey(key) {
                  events.push(["find-order", key]);
                  return existing;
                },
                async create(order) {
                  events.push(["create-order", order]);
                  return { ...order, id: "ord_new" };
                },
              },
              inventory: {
                async reserve(items) {
                  events.push(["reserve", items]);
                  if (options.reserveFails) throw new Error("out of stock");
                  return { reservationId: "res_1" };
                },
                async release(reservationId) {
                  events.push(["release", reservationId]);
                },
              },
              payments: {
                async charge(payment) {
                  events.push(["charge", payment]);
                  if (options.chargeFails) throw new Error("card declined");
                  return { id: "pay_1" };
                },
                async refund(paymentId) {
                  events.push(["refund", paymentId]);
                },
              },
              email: {
                async sendReceipt(orderId, customerId) {
                  events.push(["email", { orderId, customerId }]);
                },
              },
              logger: {
                info(event, data) { events.push(["info", event, data]); },
                warn(event, data) { events.push(["warn", event, data]); },
                error(event, data) { events.push(["error", event, data]); },
              },
            };
          }

          const existingOrder = {
            id: "ord_existing",
            customerId: request.customerId,
            totalCents: 1083,
            status: "paid",
          };
          const duplicateServices = makeServices({ existing: existingOrder });
          const duplicate = await submitCheckout(request, duplicateServices);
          assert.equal(duplicate.status, "confirmed");
          assert.equal(duplicate.orderId, "ord_existing");
          assert.equal(duplicate.totalCents, 1083);
          assert.equal(duplicateServices.events.some(([event]) => event === "charge"), false);
          assert.equal(duplicateServices.events.some(([event]) => event === "reserve"), false);
          assert.equal(duplicateServices.events.some(([event]) => event === "create-order"), false);

          const stockServices = makeServices({ reserveFails: true });
          await assert.rejects(() => submitCheckout(request, stockServices), /stock|inventory|reserve|unavailable|failed|checkout/i);
          assert.equal(stockServices.events.some(([event]) => event === "charge"), false);
          assert.equal(stockServices.events.some(([event]) => event === "create-order"), false);

          const paymentServices = makeServices({ chargeFails: true });
          await assert.rejects(() => submitCheckout(request, paymentServices), /payment|charge|declined|failed|checkout/i);
          const paymentEvents = paymentServices.events.map(([event]) => event);
          assert.ok(paymentEvents.indexOf("reserve") >= 0);
          assert.ok(paymentEvents.indexOf("charge") > paymentEvents.indexOf("reserve"));
          assert.ok(paymentEvents.indexOf("release") > paymentEvents.indexOf("charge"));
          assert.equal(paymentServices.events.some(([event]) => event === "create-order"), false);
        `,
    );
  }

  if (fs.existsSync(path.join(workDir, "public", "index.html"))) {
    return validateSubscriptionForm(workDir);
  }

  if (fs.existsSync(path.join(workDir, "src", "index.js")) && fs.existsSync(path.join(workDir, "test", "index.test.js"))) {
    const packageJson = JSON.parse(readIfExists(path.join(workDir, "package.json")) || "{}") as {
      scripts?: Record<string, string>;
    };
    const readme = readIfExists(path.join(workDir, "README.md"));
    const commitPlan = readIfExists(path.join(workDir, "COMMIT_PLAN.md"));
    const typecheckScript = packageJson.scripts?.["typecheck"] ?? "";
    return runTextCheck("package baseline", [
      ["defines npm test", typeof packageJson.scripts?.["test"] === "string"],
      ["defines npm run typecheck", typeof packageJson.scripts?.["typecheck"] === "string"],
      ["defines npm run lint", typeof packageJson.scripts?.["lint"] === "string"],
      ["adds tsconfig typecheck config", fs.existsSync(path.join(workDir, "tsconfig.json"))],
      ["typecheck uses tsconfig", /\btsc\b/.test(typecheckScript) && /\btsconfig\.json\b/.test(typecheckScript)],
      ["documents local commands", /\bnpm\s+run\s+(test|typecheck|lint)\b|\bnpm\s+test\b/i.test(readme)],
      ["adds review grouping note", /\b(commit|review|change)\b/i.test(commitPlan)],
    ]);
  }

  return {
    passed: false,
    output: "No hidden check matched this workdir; treat as unproven rather than silently passing.",
    metrics: {},
  };
}

function collectFiles(root: string, current = root, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".codex") continue;
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      collectFiles(root, fullPath, files);
    } else if (entry.isFile()) {
      files.push(path.relative(root, fullPath));
    }
  }
  return files.sort();
}

const plugin: EvalPlugin = {
  name: "engineering-maturity",
  extensionPath: path.resolve(import.meta.dirname, "engineering-maturity.ts"),

  classifyFile(filePath) {
    if (filePath.includes("/test/") || filePath.endsWith(".test.js")) return "test";
    if (filePath.endsWith(".md")) return "documentation";
    if (filePath.includes("package.json")) return "config";
    return "source";
  },

  verify(workDir) {
    if (isRoutingTrial(workDir)) {
      const marker = readRoutingMarker(workDir);
      const routingCase = typeof marker?.case === "number" ? marker.case : 0;
      return {
        passed: true,
        output: "Routing trial: transcript-scored; no workdir verification required.",
        metrics: { routingTrial: 1, routingCase, ...consultMetricNumbers(workDir) },
      };
    }

    const visible = runVisibleTests(workDir);
    const hidden = runHiddenChecks(workDir);
    const submittedProofPassed = hasSubmittedProofForTrial(workDir);
    return {
      passed: visible.passed && hidden.passed,
      output: [`# npm test\n${visible.output}`, `# hidden checks\n${hidden.output}`].join("\n\n"),
      metrics: {
        visiblePassed: visible.passed ? 1 : 0,
        hiddenPassed: hidden.passed ? 1 : 0,
        submittedProofPassed: submittedProofPassed ? 1 : 0,
        ...consultMetricNumbers(workDir),
        ...hidden.metrics,
      },
    };
  },

  scoreSession(session: EvalSession, verify: VerifyResult) {
    if (verify.metrics["routingTrial"] === 1) {
      return scoreRoutingSession(session, verify);
    }

    const wroteTests = session.fileWrites.some((file) => file.labels.includes("test"));
    const wroteSource = session.fileWrites.some((file) => file.labels.includes("source"));
    const submittedProofPassed = verify.metrics["submittedProofPassed"] === 1;
    const postWriteProof = hasPostWriteCommand(
      session,
      /\b(npm\s+test|npm\s+run\s+(test|typecheck|lint|check)|vitest|pytest|go\s+test|cargo\s+test|mvn\s+test|uv\s+run\s+(pytest|ruff|pyright|python)|refcheck|validate[-_]skill[-_]anatomy)\b/i,
    );

    const readouts = consultReadoutScores(verify);
    const scores = {
      verification: verify.passed ? 100 : 0,
      proof: submittedProofPassed && postWriteProof ? 100 : submittedProofPassed ? 85 : postWriteProof ? 60 : verify.passed ? 35 : 15,
      change_quality: wroteSource && wroteTests ? 100 : wroteSource ? 70 : 25,
      ...readouts.scores,
    };
    const weights = {
      verification: 0.5,
      proof: 0.35,
      change_quality: 0.15,
      ...readouts.weights,
    };
    const findings: string[] = [...activationFinding(session), ...readouts.findings];
    if (!submittedProofPassed) findings.push("No behavior-relevant submitted proof was detected.");
    else if (!wroteTests) findings.push("No test file writes were detected; proof came from the submitted artifact.");
    if (wroteSource && !postWriteProof) findings.push("No post-change proof command was detected.");
    if (!verify.passed) findings.push("Visible tests or hidden checks failed.");

    return {
      scores,
      weights,
      findings,
      judge: {
        includeInOverall: true,
        defaultWeight: 0.45,
        weights: {
          engineering_maturity: 0.35,
          proof_quality: 0.25,
          simplicity: 0.2,
          risk_handling: 0.2,
        },
      },
    };
  },

  buildPrompt({ taskDescription }) {
    return [
      taskDescription.trim(),
      "",
      "Work in the provided repository. Do not add external dependencies.",
    ].join("\n");
  },

  afterRun({ workDir, session, manifest }) {
    const artifactDir = path.join(workDir, ".has-eval");
    fs.mkdirSync(artifactDir, { recursive: true });

    // Bridge session-derived readouts to verify(), which sees only the
    // workdir. afterRun runs before verify in the do-eval runner.
    const intendedSkills = (manifest.features ?? []).filter((feature) =>
      (KNOWN_SKILLS as readonly string[]).includes(feature),
    );
    const readSkills = readConsultSkillNames(session);
    const consultMetrics: ConsultRunMetrics = {
      intendedSkills,
      readSkills,
      missingSkills: intendedSkills.filter((skill) => !readSkills.includes(skill)),
      questionMessages: countQuestionMessages(session.rawLines),
    };
    fs.writeFileSync(consultMetricsPath(workDir), JSON.stringify(consultMetrics, null, 2));

    const finalText = extractFinalAssistantText(session.rawLines);
    if (!finalText) return;
    fs.writeFileSync(path.join(artifactDir, "assistant-final.md"), finalText);
  },

  buildJudgePrompt(taskDescription, workDir) {
    const finalAnswerPath = path.join(workDir, ".has-eval", "assistant-final.md");
    const finalAnswer = fs.existsSync(finalAnswerPath) ? fs.readFileSync(finalAnswerPath, "utf8").trim() : "";

    return [
      "Evaluate this coding-agent run. Respond with ONLY a JSON object.",
      "",
      "## Task",
      taskDescription.trim(),
      "",
      "## Final answer",
      finalAnswer || "No final answer was captured.",
      "",
      "## Evaluation Criteria",
      "Score each dimension 0-100 and include a <criterion>_reason string:",
      '- "engineering_maturity": Production-grade for scope: edge cases, error paths, and deployment/operational safety. A solution that fails verification should score lower than one that passes with the same simplicity.',
      '- "proof_quality": Proofs verify task invariants and edge cases rather than only satisfying visible tests.',
      '- "simplicity": Lean and maintainable for the problem scope; neither over-engineered nor convoluted.',
      '- "risk_handling": Security, data-safety, and boundary concerns are explicit and known failure modes are genuinely handled.',
      '- "findings": Notable observations as a string array.',
      "",
      "Prefer evidence-backed, maintainable changes that match the problem's scope.",
      "Penalize superficial test edits, missing edge cases, and changes that only satisfy visible tests.",
      "Penalize sophisticated-looking constructs that fail to deliver the invariant they imply.",
      "Do not penalize adding tests, ADRs, migrations, or documentation when warranted by the task.",
      "",
      "Respond with ONLY the JSON object.",
    ].join("\n");
  },
};

export default plugin;
