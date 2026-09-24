import { readdirSync, readFileSync, existsSync } from "node:fs";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const stripSqlComments = (sql) => sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
const splitSqlStatements = (sql) => stripSqlComments(sql).split(";").map((s) => s.trim()).filter(Boolean);

const migrationFiles = readdirSync("migrations").filter((name) => name.endsWith(".sql") && !name.includes("rollback"));
const allMigrationSql = migrationFiles.map((name) => read("migrations/" + name)).join("\n\n");
const statements = splitSqlStatements(allMigrationSql);
const rollback = migrationFiles.map((name) => read("migrations/" + name.replace(/\.sql$/, ".rollback.sql"))).join("\n");
const operations = [read("OPERATIONS.md"), read("operations.md"), read("ROLLBACK.md"), read("README.md")].join("\n");

const partialIndexNames = Array.from(
  allMigrationSql.matchAll(/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([a-z0-9_]+)\b[^;]*\bwhere\b[^;]*;/gi),
).map((m) => m[1]?.toLowerCase()).filter(Boolean);
const constraintAttachments = Array.from(
  allMigrationSql.matchAll(/add\s+constraint\s+[a-z0-9_]+\s+unique\s+using\s+index\s+([a-z0-9_]+)/gi),
).map((m) => m[1]?.toLowerCase()).filter(Boolean);
const brokenAttachment = constraintAttachments.find((name) => partialIndexNames.includes(name));
const allowedPostgresStatements = statements.every((statement) =>
  [
    /^alter\s+table\s+customers\s+add\s+column\s+(?:if\s+not\s+exists\s+)?email\s+text(?:\s+null)?$/i,
    /^create\s+unique\s+index\s+concurrently\s+(?:if\s+not\s+exists\s+)?[a-z0-9_]+\s+on\s+customers\s*\(\s*(?:lower\s*\(\s*)?email\s*\)?\s*\)(?:\s+where\s+email\s+is\s+not\s+null)?$/i,
    /^alter\s+table\s+customers\s+add\s+constraint\s+[a-z0-9_]+\s+unique\s+using\s+index\s+[a-z0-9_]+$/i,
  ].some((pattern) => pattern.test(statement.replace(/\s+/g, " "))),
);

const checks = [
  ["contains only recognized Postgres online-migration statements", statements.length > 0 && allowedPostgresStatements],
  ["uses a concurrent unique index build", /create\s+unique\s+index\s+concurrently\b/i.test(allMigrationSql)],
  ["does not create a blocking unique index", !/create\s+unique\s+index\s+(?!concurrently\b)/i.test(allMigrationSql)],
  ["separates uniqueness from the initial table change", statements.length >= 2],
  ["adds a rollback file", rollback.length > 0],
  ["rollback reverses schema or index changes", /\b(drop\s+index|drop\s+constraint|drop\s+column)\b/i.test(rollback)],
  ["documents rollout", /\b(rollout|deploy|apply)\b/i.test(operations)],
  ["documents validation", /\b(validate|verification|check)\b/i.test(operations)],
  ["documents rollback", /\brollback\b/i.test(operations)],
  [`does not back a unique constraint with a partial index${brokenAttachment ? ` (${brokenAttachment})` : ""}`, brokenAttachment === undefined],
];
const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length > 0) {
  console.error("customer email migration: failed checks: " + failed.join(", "));
  process.exit(1);
}
